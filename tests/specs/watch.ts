import { setTimeout } from 'node:timers/promises';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';
import { processInteract } from '../utils/process-interact.js';
import { createPackageJson } from '../fixtures.js';

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
					'package.json': createPackageJson({
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
						data => data.includes('[tsx] change in ./value.js Rerunning...\n'),
						data => data.includes('goodbye world\n'),
					],
					9000,
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

		describe('include', ({ test }) => {
			test('file path & glob', async () => {
				const entryFile = 'index.js';
				const fileA = 'file-a';
				const fileB = 'directory/file-b';
				await using fixture = await createFixture({
					[entryFile]: `
						import fs from 'fs/promises';
						Promise.all([
							fs.readFile('./${fileA}', 'utf8'),
							fs.readFile('./${fileB}', 'utf8')
						]).then(console.log, console.error);
					`.trim(),
					[fileA]: 'content-a',
					[fileB]: 'content-b',
				});

				const tsxProcess = tsx(
					[
						'watch',
						'--clear-screen=false',
						`--include=${fileA}`,
						'--include=directory/*',
						entryFile,
					],
					fixture.path,
				);

				await processInteract(
					tsxProcess.stdout!,
					[
						(data) => {
							if (data.includes("'content-a', 'content-b'")) {
								fixture.writeFile(fileA, 'update-a');
								return true;
							}
						},
						(data) => {
							if (data.includes("'update-a', 'content-b'")) {
								fixture.writeFile(fileB, 'update-b');
								return true;
							}
						},
						(data) => {
							if (data.includes("'update-a', 'update-b'")) {
								return true;
							}
						},
					],
					9000,
				);

				tsxProcess.kill();

				const tsxProcessResolved = await tsxProcess;
				expect(tsxProcessResolved.stderr).toBe('');
			}, 10_000);
		});

		describe('exclude (ignore)', ({ test }) => {
			test('file path & glob', async ({ onTestFail }) => {
				const entryFile = 'index.js';
				const fileA = 'file-a.js';
				const fileB = 'directory/file-b.js';
				const depA = 'node_modules/a/index.js';

				await using fixtureGlob = await createFixture({
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

				const tsxProcess = tsx(
					[
						'watch',
						'--clear-screen=false',
						`--ignore=${fileA}`,
						'--exclude=directory/*',
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

				await expect(
					processInteract(
						tsxProcess.stdout!,
						[
							async (data) => {
								if (data !== 'logA logB logC\n') {
									return;
								}

								// These changes should not trigger a re-run
								await Promise.all([
									fixtureGlob.writeFile(fileA, `export default "${negativeSignal}"`),
									fixtureGlob.writeFile(fileB, `export default "${negativeSignal}"`),
									fixtureGlob.writeFile(depA, `export default "${negativeSignal}"`),
								]);
								return true;
							},
							(data) => {
								if (data.includes(negativeSignal)) {
									throw new Error('Unexpected re-run');
								}
							},
						],
						2000,
					),
				).rejects.toThrow('Timeout'); // Watch should not trigger

				tsxProcess.kill();

				await tsxProcess;
			}, 10_000);
		});

		test('SIGHUP triggers reload', async ({ onTestFinish, onTestFail }) => {
			if (process.platform === 'win32') {
				return;
			}

			const fixtureSighup = await createFixture({
				'package.json': createPackageJson({
					type: 'module',
				}),
				'index.js': `
					console.log('hello from index');
				`,
			});
			onTestFinish(async () => await fixtureSighup.rm());

			const tsxProcess = tsx(
				[
					'watch',
					'--clear-screen=false',
					'index.js',
				],
				fixtureSighup.path,
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
						if (data.includes('hello from index\n')) {
							// Send SIGHUP signal to trigger reload
							await setTimeout(100);
							tsxProcess.kill('SIGHUP');
							return true;
						}
					},
					data => data.includes('SIGHUP') && (data.includes('Rerunning...') || data.includes('Restarting...')),
					data => data.includes('hello from index\n'),
				],
				9000,
			);

			tsxProcess.kill();

			const { all } = await tsxProcess;
			expect(all).toMatch('SIGHUP');
			expect(all).toMatch(/Rerunning|Restarting/);
			// Should have run at least twice (initial + reload)
			const runCount = (all.match(/hello from index/g) || []).length;
			expect(runCount).toBeGreaterThanOrEqual(2);
		}, 10_000);
	});
});
