import { setTimeout } from 'node:timers/promises';
import {
	describe, test, onFinish, onTestFinish, onTestFail, expect, skip,
} from 'manten';
import { createFixture } from 'fs-fixture';
import { tsxPath, type NodeApis } from '../utils/tsx.js';
import { ptyShell, isWindows } from '../utils/pty-shell/index.js';
import { processInteract } from '../utils/process-interact.js';
import { createPackageJson } from '../fixtures.js';

const clearScreenSequence = '\u001Bc';
const quoteShellArgument = (
	argument: string,
) => `'${argument.replaceAll("'", String.raw`'"'"'`)}'`;

export const watch = ({ tsx, path: nodePath }: NodeApis) => describe('watch', async () => {
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
		await processInteract(
			tsxProcess.stdout!,
			[
				async ({ output }) => {
					if (output.includes('hello world\n')) {
						await setTimeout(1000);
						await fixtureWatch.writeFile('value.js', 'export const value = \'goodbye world\';');
						return true;
					}
				},
				({ output }) => output.includes('[tsx] change in ./value.js Rerunning...\n'),
				({ output }) => output.includes('goodbye world\n'),
			],
			9000,
		);

		tsxProcess.kill();

		const { all } = await tsxProcess;
		expect(all!.startsWith('hello world\n')).toBe(true);
	}, 10_000);

	await test('watches literal paths containing glob characters', async () => {
		await using fixtureLiteral = await createFixture({
			'{env}/index.ts': `
				import value from './[dependency].ts';
				console.log(value);
			`,
			'{env}/[dependency].ts': 'export default "original"',
		});
		const tsxProcess = tsx(
			['watch', '--clear-screen=false', './{env}/index.ts'],
			fixtureLiteral.path,
		);
		await processInteract(
			tsxProcess.stdout!,
			[
				async ({ output }) => {
					if (output.includes('original')) {
						await setTimeout(1000);
						await fixtureLiteral.writeFile(
							'{env}/[dependency].ts',
							'export default "updated"',
						);
						return true;
					}
				},
				({ output }) => output.includes('updated'),
			],
			9000,
		);

		tsxProcess.kill();
		const result = await tsxProcess;
		expect(result.stderr).toBe('');
	}, 10_000);

	await test('starts with a bang-prefixed literal entry', async () => {
		await using fixtureBang = await createFixture({
			'!entry.ts': 'console.log("bang entry")',
		});
		const tsxProcess = tsx(
			['watch', '--clear-screen=false', './!entry.ts'],
			fixtureBang.path,
		);
		await processInteract(
			tsxProcess.stdout!,
			[({ output }) => output.includes('bang entry')],
			5000,
		);

		tsxProcess.kill();
		const result = await tsxProcess;
		expect(result.stderr).toBe('');
	}, 10_000);

	await test('starts with only negated include patterns', async () => {
		await using fixtureNegated = await createFixture({
			'index.ts': 'console.log("negated include")',
		});
		const tsxProcess = tsx(
			[
				'watch',
				'--clear-screen=false',
				'--include=!ignored/**',
				'index.ts',
			],
			fixtureNegated.path,
		);
		await processInteract(
			tsxProcess.stdout!,
			[({ output }) => output.includes('negated include')],
			5000,
		);

		tsxProcess.kill();
		const result = await tsxProcess;
		expect(result.stderr).toBe('');
	}, 10_000);

	await test('runtime dependencies override exact include negations', async () => {
		await using fixtureDependency = await createFixture({
			'index.ts': `
				import value from './dependency.ts';
				console.log(value);
			`,
			'dependency.ts': 'export default "original"',
		});
		const tsxProcess = tsx(
			[
				'watch',
				'--clear-screen=false',
				'--include=!dependency.ts',
				'index.ts',
			],
			fixtureDependency.path,
		);
		await processInteract(
			tsxProcess.stdout!,
			[
				async ({ output }) => {
					if (output.includes('original')) {
						await setTimeout(1000);
						await fixtureDependency.writeFile(
							'dependency.ts',
							'export default "updated"',
						);
						return true;
					}
				},
				({ output }) => output.includes('updated'),
			],
			9000,
		);

		tsxProcess.kill();
		const result = await tsxProcess;
		expect(result.stderr).toBe('');
	}, 10_000);

	await test('deduplicates overlapping literal and include events', async () => {
		await using fixtureOverlap = await createFixture({
			'source/index.ts': 'console.log("RUN: original")',
		});
		const tsxProcess = tsx(
			[
				'watch',
				'--clear-screen=false',
				'--include=source/**/*.ts',
				'source/index.ts',
			],
			fixtureOverlap.path,
		);
		await processInteract(
			tsxProcess.stdout!,
			[
				async ({ output }) => {
					if (output.includes('RUN: original')) {
						await setTimeout(1000);
						await fixtureOverlap.writeFile(
							'source/index.ts',
							'console.log("RUN: updated")',
						);
						return true;
					}
				},
				async ({ output }) => {
					if (output.includes('RUN: updated')) {
						await setTimeout(300);
						return true;
					}
				},
			],
			9000,
		);

		tsxProcess.kill();
		const result = await tsxProcess;
		expect(result.all!.match(/RUN:/g)?.length).toBe(2);
		expect(result.all!.match(/Rerunning|Restarting/g)?.length).toBe(1);
	}, 10_000);

	await test('observes include changes made during the initial run', async () => {
		await using fixtureStartup = await createFixture({
			'index.js': `
				const fs = require('node:fs');
				const state = fs.readFileSync('state.txt', 'utf8');
				console.log(state);
				if (state === 'initial') {
					fs.writeFileSync('state.txt', 'updated');
				}
			`,
			'state.txt': 'initial',
		});
		const tsxProcess = tsx(
			[
				'watch',
				'--clear-screen=false',
				'--include=!state.txt',
				`--include=${fixtureStartup.getPath('state.txt')}`,
				'index.js',
			],
			fixtureStartup.path,
		);
		await processInteract(
			tsxProcess.stdout!,
			[
				({ output }) => output.includes('initial'),
				({ output }) => output.includes('updated'),
			],
			9000,
		);

		tsxProcess.kill();
		const result = await tsxProcess;
		expect(result.stderr).toBe('');
	}, 10_000);

	await test('suppresses warnings & skips clear screen when stdout is piped', async () => {
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
				({ chunk }) => {
					if (chunk.includes('log-argv.ts')) {
						tsxProcess.stdin?.write('enter');
						return true;
					}
				},
				({ chunk }) => chunk.includes('log-argv.ts'),
			],
			5000,
		);

		tsxProcess.kill();

		const { all } = await tsxProcess;
		expect(all).not.toMatch('Warning');
		expect(all).not.toMatch(clearScreenSequence);
		expect(all!.startsWith('["')).toBeTruthy();
	}, 10_000);

	await test('clears screen on rerun when stdout is a TTY', async () => {
		if (isWindows) {
			// ConPTY re-renders terminal output, so the raw clear sequence
			// cannot be asserted reliably on Windows
			skip('ConPTY transforms escape sequences');
		}

		await using shell = ptyShell();
		await shell.waitForPrompt();
		shell.type([
			nodePath,
			tsxPath,
			'watch',
			fixture.getPath('log-argv.ts'),
		].map(quoteShellArgument).join(' '));
		await shell.waitForLine(/\["/);
		shell.press('\r');

		// Raw output is needed because waitForLine strips ANSI sequences
		const pollTimeout = Date.now() + 5000;
		while (!shell.getOutput().includes(clearScreenSequence)) {
			if (Date.now() > pollTimeout) {
				break;
			}
			await setTimeout(50);
		}

		onTestFail(() => {
			console.log({ output: shell.getOutput() });
		});
		expect(shell.getOutput()).toMatch(clearScreenSequence);
	}, 15_000);

	await test('passes flags', async () => {
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
			[({ output }) => output.startsWith('["')],
			5000,
		);

		tsxProcess.kill();

		const { all } = await tsxProcess;
		expect(all).toMatch('"--some-flag"');
	}, 10_000);

	await test('wait for exit', async () => {
		if (process.platform === 'win32') {
			// Windows child kills are abrupt, so SIGTERM cannot exercise exit handlers.
			// https://github.com/nodejs/node/blob/v24.15.0/doc/api/child_process.md#L1720-L1722
			skip('Windows kills child processes abruptly');
		}

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
		onTestFinish(async () => {
			await fixtureExit.rm();
		});

		await processInteract(
			tsxProcess.stdout!,
			[
				({ output }) => {
					if (output.includes('start\n')) {
						tsxProcess.stdin?.write('enter');
						return true;
					}
				},
				({ output }) => output.includes('end\n'),
			],
			5000,
		);

		tsxProcess.kill();

		const { all } = await tsxProcess;
		expect(all).toMatch(/start[\s\S]+end/);
	}, 10_000);

	await describe('Ctrl + C', async () => {
		const CtrlC = '\u0003';

		await test('exits with 130 when script already exited (issue #734)', async () => {
			await using fixtureExited = await createFixture({
				'index.js': 'console.log("READY")',
			});

			await using shell = ptyShell();

			onTestFail(() => {
				console.log({ stdout: shell.getOutput() });
			});

			await shell.waitForPrompt();
			// PowerShell needs the call operator to run a quoted command
			shell.type(`${isWindows ? '& ' : ''}"${nodePath}" "${tsxPath}" watch "${fixtureExited.getPath('index.js')}"`);

			await shell.waitForLine(/READY/);

			// Wait for the child process to exit so the watcher is idle
			await setTimeout(1000);
			shell.press(CtrlC);

			await shell.waitForPrompt();
			shell.type(`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}`);

			await shell.waitForPrompt();

			expect(await shell.close()).toMatch(/EXIT_CODE:\s+130/);
		}, {
			timeout: 15_000,
			retry: 3,
		});
	});

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
			await processInteract(
				tsxProcess.stdout!,
				[({ output }) => output.startsWith('["')],
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
			await processInteract(
				tsxProcess.stdout!,
				[
					async ({ output }) => {
						if (output.includes("'content-a', 'content-b'")) {
							await fixture.writeFile(fileA, 'update-a');
							return true;
						}
					},
					async ({ output }) => {
						if (output.includes("'update-a', 'content-b'")) {
							await fixture.writeFile(fileB, 'update-b');
							return true;
						}
					},
					({ output }) => {
						if (output.includes("'update-a', 'update-b'")) {
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
			const negativeSignal = 'fail';

			await expect(
				processInteract(
					tsxProcess.stdout!,
					[
						async ({ output }) => {
							if (!output.includes('logA logB logC\n')) {
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
						({ output }) => {
							if (output.includes(negativeSignal)) {
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

		test('ignores pnpm dependency realpaths outside cwd', async () => {
			const dependencyPath = 'node_modules/.pnpm/pnpm-dep@1.0.0/node_modules/pnpm-dep';
			const dependencyFile = `${dependencyPath}/index.js`;

			// Mock the dependency files
			await using fixturePnpm = await createFixture({
				[dependencyFile]: 'module.exports = "dependency";',
				'packages/app/index.js': `
					console.log(require('pnpm-dep'));
					setInterval(() => {}, 1000);
				`.trim(),
				'packages/app/node_modules/pnpm-dep': ({ getPath, symlink }) => symlink(
					getPath(dependencyPath),
					'junction',
				),
			});
			const appPath = fixturePnpm.getPath('packages/app');

			// Start tsx
			const tsxProcess = tsx(
				['watch', '--clear-screen=false', 'index.js'],
				appPath,
			);

			// Monitor healthy startup
			await processInteract(
				tsxProcess.stdout!,
				[({ output }) => output.includes('dependency\n')],
				5000,
			);

			// Rewrite the node_modules dependency
			await setTimeout(1000);
			await fixturePnpm.writeFile(dependencyFile, 'module.exports = "updated";');
			await setTimeout(2000);
			tsxProcess.kill();

			// Make sure tsx has not restarted
			const { all } = await tsxProcess;
			expect(all).not.toMatch('Restarting...');
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
		await processInteract(
			tsxProcess.stdout!,
			[({ output }) => output.startsWith('["')],
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
		let output = '';
		await processInteract(
			tsxProcess.all!,
			[
				async ({ output: stdout }) => {
					output = stdout;
					if (stdout.includes('Error: fails')) {
						await setTimeout(100);
						await fixtureRecovery.writeFile('index.ts', 'console.log("recovered")');
						return true;
					}
				},
				({ output: stdout }) => {
					output = stdout;
					return stdout.includes('[tsx] change in ./index.ts Rerunning...\n');
				},
				({ output: stdout }) => {
					output = stdout;
					return stdout.includes('recovered\n');
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
