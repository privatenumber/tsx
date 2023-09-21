import { type Readable } from 'node:stream';
import path from 'path';
import { setTimeout } from 'timers/promises';
import { on } from 'events';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { tsx } from '../utils/tsx';

type MaybePromise<T> = T | Promise<T>;
const interact = async (
	stdout: Readable,
	actions: ((data: string) => MaybePromise<boolean | void>)[],
) => {
	let currentAction = actions.shift();

	const buffers: Buffer[] = [];
	while (currentAction) {
		for await (const [chunk] of on(stdout, 'data')) {
			buffers.push(chunk);
			if (await currentAction(chunk.toString())) {
				currentAction = actions.shift();
				break;
			}
		}
	}

	return Buffer.concat(buffers).toString();
};

export default testSuite(async ({ describe }, fixturePath: string) => {
	describe('watch', ({ test, describe }) => {
		test('require file path', async () => {
			const tsxProcess = await tsx({
				args: ['watch'],
			});
			expect(tsxProcess.exitCode).toBe(1);
			expect(tsxProcess.stderr).toMatch('Error: Missing required parameter "script path"');
		});

		test('watch files for changes', async ({ onTestFinish }) => {
			let initialValue = Date.now();
			const fixture = await createFixture({
				'package.json': JSON.stringify({
					type: 'module',
				}),
				'index.js': `
				import { value } from './value.js';
				console.log(value);
				`,
				'value.js': `export const value = ${initialValue};`,
			});
			onTestFinish(async () => await fixture.rm());

			const tsxProcess = tsx({
				args: [
					'watch',
					path.join(fixture.path, 'index.js'),
				],
			});

			await interact(
				tsxProcess.stdout!,
				[
					async (data) => {
						if (data.includes(`${initialValue}\n`)) {
							initialValue = Date.now();
							await fixture.writeFile('value.js', `export const value = ${initialValue};`);
							return true;
						}
					},
					data => data.includes(`${initialValue}\n`),
				],
			);

			tsxProcess.kill();

			await tsxProcess;
		}, 10_000);

		test('suppresses warnings & clear screen', async () => {
			const tsxProcess = tsx({
				args: [
					'watch',
					path.join(fixturePath, 'log-argv.ts'),
				],
			});

			await interact(
				tsxProcess.stdout!,
				[
					(data) => {
						if (data.includes('log-argv.ts')) {
							tsxProcess.stdin?.write('enter');
							return true;
						}
					},
					data => data.includes('log-argv.ts'),
				],
			);

			tsxProcess.kill();

			const { all } = await tsxProcess;
			expect(all).not.toMatch('Warning');
			expect(all).toMatch('\u001Bc');
		}, 10_000);

		test('passes flags', async () => {
			const tsxProcess = tsx({
				args: [
					'watch',
					path.join(fixturePath, 'log-argv.ts'),
					'--some-flag',
				],
			});

			await interact(
				tsxProcess.stdout!,
				[data => data.startsWith('["')],
			);

			tsxProcess.kill();

			const { all } = await tsxProcess;
			expect(all).toMatch('"--some-flag"');
		}, 10_000);

		test('wait for exit', async ({ onTestFinish }) => {
			const fixture = await createFixture({
				'index.js': `
				console.log('start');
				const sleepSync = (delay) => {
					const waitTill = Date.now() + delay;
					while (Date.now() < waitTill) {}
				};
				process.on('exit', () => {
					sleepSync(300);
					console.log('end');
				});
				`,
			});

			onTestFinish(async () => await fixture.rm());

			const tsxProcess = tsx({
				args: [
					'watch',
					path.join(fixture.path, 'index.js'),
				],
			});

			await interact(
				tsxProcess.stdout!,
				[
					(data) => {
						if (data.includes('start\n')) {
							tsxProcess.stdin?.write('enter');
							return true;
						}
					},
					data => data.includes('end\n'),
				],
			);

			tsxProcess.kill();

			const { all } = await tsxProcess;
			expect(all).toMatch(/start[\s\S]+end/);
		}, 10_000);

		describe('help', ({ test }) => {
			test('shows help', async () => {
				const tsxProcess = await tsx({
					args: ['watch', '--help'],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch('Run the script and watch for changes');
				expect(tsxProcess.stderr).toBe('');
			});

			test('passes down --help to file', async () => {
				const tsxProcess = tsx({
					args: [
						'watch',
						path.join(fixturePath, 'log-argv.ts'),
						'--help',
					],
				});

				await interact(
					tsxProcess.stdout!,
					[data => data.startsWith('["')],
				);

				tsxProcess.kill();

				const { all } = await tsxProcess;
				expect(all).toMatch('"--help"');
			}, 5000);
		});

		describe('ignore', ({ test }) => {
			test('file path & glob', async ({ onTestFinish }) => {
				const entryFile = 'index.js';
				const fileA = 'file-a.js';
				const fileB = 'directory/file-b.js';
				const depA = 'node_modules/a/index.js';

				const fixture = await createFixture({
					[fileA]: 'export default "logA"',
					[fileB]: 'export default "logB"',
					[depA]: 'export default "logC"',
					[entryFile]: `
						import valueA from './${fileA}'
						import valueB from './${fileB}'
						import valueC from './${depA}'
						console.log(valueA, valueB, valueC)
					`.trim(),
				});

				onTestFinish(async () => await fixture.rm());

				const tsxProcess = tsx({
					cwd: fixture.path,
					args: [
						'watch',
						'--clear-screen=false',
						`--ignore=${fileA}`,
						`--ignore=${path.join(fixture.path, 'directory/*')}`,
						entryFile,
					],
				});
				const negativeSignal = '"fail"';

				await interact(
					tsxProcess.stdout!,
					[
						async (data) => {
							if (data.includes('fail')) {
								throw new Error('should not log ignored file');
							}

							if (data === 'logA logB logC\n') {
								// These changes should not trigger a re-run
								await Promise.all([
									fixture.writeFile(fileA, `export default ${negativeSignal}`),
									fixture.writeFile(fileB, `export default ${negativeSignal}`),
									fixture.writeFile(depA, `export default ${negativeSignal}`),
								]);

								await setTimeout(1500);
								await fixture.writeFile(entryFile, 'console.log("TERMINATE")');
								return true;
							}
						},
						data => data === 'TERMINATE\n',
					],
				);

				tsxProcess.kill();

				const { all, stderr } = await tsxProcess;
				expect(all).not.toMatch('fail');
				expect(stderr).toBe('');
			}, 10_000);
		});
	});
});
