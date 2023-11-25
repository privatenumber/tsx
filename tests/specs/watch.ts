import path from 'path';
import { setTimeout } from 'timers/promises';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import stripAnsi from 'strip-ansi';
import type { NodeApis } from '../utils/tsx.js';
import { processInteract } from '../utils/process-interact.js';

export default testSuite(async ({ describe }, { tsx }: NodeApis) => {
	describe('watch', async ({ test, describe, onFinish }) => {
		const fixture = await createFixture({
			// Unnecessary TS to test syntax
			'log-argv.ts': 'console.log(JSON.stringify(process.argv) as string)',
		});
		onFinish(async () => await fixture.rm());

		test('require file path', async () => {
			const tsxProcess = await tsx(['watch']);
			expect(tsxProcess.exitCode).toBe(1);
			expect(tsxProcess.stderr).toMatch('Error: Missing required parameter "script path"');
		});

		for (const packageType of ['module', 'commonjs'] as const) {
			test(`watch files for changes in ${packageType} package`, async ({ onTestFinish, onTestFail }) => {
				const fixtureWatch = await createFixture({
					'package.json': JSON.stringify({
						type: packageType,
					}),
					'index.js': `
					import { value } from './value.js';
					console.log(value);
					`,
					'value.js': 'export const value = \'hello world\';',
				});
				onTestFinish(async () => await fixtureWatch.rm());

				const tsxProcess = tsx(
					[
						'watch',
						'index.js',
					],
					fixtureWatch.path,
				);

				onTestFail(async () => {
					if (tsxProcess.exitCode === null) {
						console.log('Force killing hanging process\n\n');
						tsxProcess.kill('SIGKILL');
						console.log({
							tsxProcess: await tsxProcess,
						});
					}
				});

				await processInteract(
					tsxProcess.stdout!,
					[
						async (data) => {
							if (data.includes('hello world\n')) {
								await setTimeout(1000);
								fixtureWatch.writeFile('value.js', 'export const value = \'goodbye world\';');
								return true;
							}
						},
						data => stripAnsi(data).includes('[tsx] change in ./value.js Rerunning...\n'),
						data => data.includes('goodbye world\n'),
					],
					5000,
				);

				tsxProcess.kill();

				const { all } = await tsxProcess;
				expect(all!.startsWith('hello world\n')).toBe(true);
			}, 10_000);
		}

		test('suppresses warnings & clear screen', async () => {
			const tsxProcess = tsx(
				[
					'watch',
					'log-argv.ts',
				],
				fixture.path,
			);

			await processInteract(
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
				5000,
			);

			tsxProcess.kill();

			const { all } = await tsxProcess;
			expect(all).not.toMatch('Warning');
			expect(all).toMatch('\u001Bc');
			expect(all!.startsWith('["')).toBeTruthy();
		}, 10_000);

		test('passes flags', async () => {
			const tsxProcess = tsx(
				[
					'watch',
					'log-argv.ts',
					'--some-flag',
				],
				fixture.path,
			);

			await processInteract(
				tsxProcess.stdout!,
				[data => data.startsWith('["')],
				5000,
			);

			tsxProcess.kill();

			const { all } = await tsxProcess;
			expect(all).toMatch('"--some-flag"');
		}, 10_000);

		test('wait for exit', async ({ onTestFinish, onTestFail }) => {
			const fixtureExit = await createFixture({
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

			const tsxProcess = tsx(
				[
					'watch',
					'index.js',
				],
				fixtureExit.path,
			);

			onTestFail(async () => {
				if (tsxProcess.exitCode === null) {
					console.log('Force killing hanging process\n\n');
					tsxProcess.kill('SIGKILL');
					console.log({
						tsxProcess: await tsxProcess,
					});
				}
			});

			onTestFinish(async () => {
				await fixtureExit.rm();
			});

			await processInteract(
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
				5000,
			);

			tsxProcess.kill();

			const { all } = await tsxProcess;
			expect(all).toMatch(/start[\s\S]+end/);
		}, 10_000);

		describe('help', ({ test }) => {
			test('shows help', async () => {
				const tsxProcess = await tsx(['watch', '--help']);

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch('Run the script and watch for changes');
				expect(tsxProcess.stderr).toBe('');
			});

			test('passes down --help to file', async ({ onTestFail }) => {
				const tsxProcess = tsx(
					[
						'watch',
						'log-argv.ts',
						'--help',
					],
					fixture.path,
				);

				await processInteract(
					tsxProcess.stdout!,
					[data => data.startsWith('["')],
					5000,
				);

				tsxProcess.kill();

				const { all } = await tsxProcess;
				onTestFail(() => {
					console.log(all);
				});

				expect(all).toMatch('"--help"');
			}, 10_000);
		});

		describe('ignore', ({ test }) => {
			test('file path & glob', async ({ onTestFinish, onTestFail }) => {
				const entryFile = 'index.js';
				const fileA = 'file-a.js';
				const fileB = 'directory/file-b.js';
				const depA = 'node_modules/a/index.js';

				const fixtureGlob = await createFixture({
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

				onTestFinish(async () => await fixtureGlob.rm());

				const tsxProcess = tsx(
					[
						'watch',
						'--clear-screen=false',
						`--ignore=${fileA}`,
						`--ignore=${path.join(fixtureGlob.path, 'directory/*')}`,
						entryFile,
					],
					fixtureGlob.path,
				);

				onTestFail(async () => {
					// If timed out, force kill process
					if (tsxProcess.exitCode === null) {
						console.log('Force killing hanging process\n\n');
						tsxProcess.kill();
						console.log({
							tsxProcess: await tsxProcess,
						});
					}
				});

				const negativeSignal = 'fail';

				await processInteract(
					tsxProcess.stdout!,
					[
						async (data) => {
							if (data.includes(negativeSignal)) {
								throw new Error('should not log ignored file');
							}

							if (data === 'logA logB logC\n') {
								// These changes should not trigger a re-run
								await Promise.all([
									fixtureGlob.writeFile(fileA, `export default "${negativeSignal}"`),
									fixtureGlob.writeFile(fileB, `export default "${negativeSignal}"`),
									fixtureGlob.writeFile(depA, `export default "${negativeSignal}"`),
								]);

								await setTimeout(1000);
								fixtureGlob.writeFile(entryFile, 'console.log("TERMINATE")');
								return true;
							}
						},
						data => data === 'TERMINATE\n',
					],
					9000,
				);

				tsxProcess.kill();

				const p = await tsxProcess;
				expect(p.all).not.toMatch('fail');
				expect(p.stderr).toBe('');
			}, 10_000);
		});
	});
});
