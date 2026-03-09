import { setTimeout } from 'node:timers/promises';
import {
	describe, test, onFinish, onTestFinish, onTestFail, expect,
} from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';
import { processInteract } from '../utils/process-interact.js';
import { createPackageJson } from '../fixtures.js';

const registerWatchCleanup = (
	tsxProcess: import('node:child_process').ChildProcess & PromiseLike<unknown>,
) => {
	onTestFail(async () => {
		if (tsxProcess.exitCode === null) {
			console.log('Force killing hanging process\n\n');
			tsxProcess.kill('SIGKILL');
			console.log({
				tsxProcess: await tsxProcess,
			});
		}
	});

	onTestFinish(() => {
		if (tsxProcess.exitCode === null) {
			tsxProcess.kill('SIGKILL');
		}
	});
};

export const watch = ({ tsx }: NodeApis) => describe('watch', async () => {
	const fixture = await createFixture({
		// Unnecessary TS to test syntax
		'log-argv.ts': 'console.log(JSON.stringify(process.argv) as string)',
	});
	onFinish(async () => await fixture.rm());

	await test('require file path', async () => {
		const tsxProcess = await tsx(['watch']);
		expect(tsxProcess.exitCode).toBe(1);
		expect(tsxProcess.stderr).toMatch('Error: Missing required parameter "script path"');
	});

	// Watch mode's file-change detection is module-system-agnostic.
	await test('watch files for changes', async () => {
		const fixtureWatch = await createFixture({
			'package.json': createPackageJson({
				type: 'module',
			}),
			'index.js': `
				import { value } from './value.js';
				console.log(value);
				`,
			'value.js': 'export const value = \'hello world\';',
		});
		onTestFinish(async () => fixtureWatch.rm());

		const tsxProcess = tsx(
			[
				'watch',
				'index.js',
			],
			fixtureWatch.path,
		);
		registerWatchCleanup(tsxProcess);

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

	await test('suppresses warnings & clear screen', async () => {
		const tsxProcess = tsx(
			[
				'watch',
				'log-argv.ts',
			],
			fixture.path,
		);
		registerWatchCleanup(tsxProcess);

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

	await test('passes flags', async () => {
		const tsxProcess = tsx(
			[
				'watch',
				'log-argv.ts',
				'--some-flag',
			],
			fixture.path,
		);
		registerWatchCleanup(tsxProcess);

		await processInteract(
			tsxProcess.stdout!,
			[data => data.startsWith('["')],
			5000,
		);

		tsxProcess.kill();

		const { all } = await tsxProcess;
		expect(all).toMatch('"--some-flag"');
	}, 10_000);

	await test('wait for exit', async () => {
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
		registerWatchCleanup(tsxProcess);

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

	await describe('help', () => {
		test('shows help', async () => {
			const tsxProcess = await tsx(['watch', '--help']);

			expect(tsxProcess.exitCode).toBe(0);
			expect(tsxProcess.stdout).toMatch('Run the script and watch for changes');
			expect(tsxProcess.stderr).toBe('');
		});

		test('passes down --help to file', async () => {
			const tsxProcess = tsx(
				[
					'watch',
					'log-argv.ts',
					'--help',
				],
				fixture.path,
			);
			registerWatchCleanup(tsxProcess);

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

	await describe('include', () => {
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
			registerWatchCleanup(tsxProcess);

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

	await describe('exclude (ignore)', () => {
		test('file path & glob', async () => {
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
			registerWatchCleanup(tsxProcess);

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

	await test('strips internal watch flags from child argv', async () => {
		await using fixtureArgv = await createFixture({
			'log-argv.ts': 'console.log(JSON.stringify(process.argv) as string)',
			'include.ts': '',
			'ignored.ts': '',
		});

		const tsxProcess = tsx(
			[
				'watch',
				'--clear-screen=false',
				'--include=include.ts',
				'--exclude=ignored.ts',
				'log-argv.ts',
				'--user-flag',
			],
			fixtureArgv.path,
		);
		registerWatchCleanup(tsxProcess);

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

		const [argvLog] = all!.split('\n');
		const argv = JSON.parse(argvLog) as string[];

		expect(argv).toContain('--user-flag');
		expect(argv).not.toContain('--clear-screen=false');
		expect(argv).not.toContain('--include=include.ts');
		expect(argv).not.toContain('--exclude=ignored.ts');
	}, 10_000);

	await test('recovers after initial runtime failure', async () => {
		await using fixtureRecovery = await createFixture({
			'index.ts': 'throw new Error("fails")',
		});

		const tsxProcess = tsx(
			[
				'watch',
				'--clear-screen=false',
				'index.ts',
			],
			fixtureRecovery.path,
		);
		registerWatchCleanup(tsxProcess);

		let output = '';
		await processInteract(
			tsxProcess.all!,
			[
				async (data) => {
					output += data;
					if (data.includes('Error: fails')) {
						await setTimeout(100);
						fixtureRecovery.writeFile('index.ts', 'console.log("recovered")');
						return true;
					}
				},
				(data) => {
					output += data;
					return data.includes('[tsx] change in ./index.ts Rerunning...\n');
				},
				(data) => {
					output += data;
					return data.includes('recovered\n');
				},
			],
			10_000,
		);

		tsxProcess.kill();
		await tsxProcess;
		onTestFail(() => {
			console.log(output);
		});

		expect(output).toMatch('Error: fails');
		expect(output).toMatch('recovered');
	}, 15_000);
});
