import { setTimeout } from 'node:timers/promises';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import packageJson from '../../package.json';
import { ptyShell, isWindows } from '../utils/pty-shell/index.js';
import { expectMatchInOrder } from '../utils/expect-match-in-order.js';
import { tsxPath, type NodeApis } from '../utils/tsx.js';
import { isProcessAlive } from '../utils/is-process-alive.js';

export default testSuite(({ describe }, node: NodeApis) => {
	const { tsx } = node;

	describe('CLI', ({ describe, test }) => {
		describe('argv', async ({ describe, onFinish }) => {
			const fixture = await createFixture({
				// Unnecessary TS to test syntax
				'log-argv.ts': 'console.log(JSON.stringify(process.argv) as string)',
			});
			onFinish(async () => await fixture.rm());

			describe('version', ({ test }) => {
				test('shows version', async () => {
					const tsxProcess = await tsx(['--version']);

					expect(tsxProcess.exitCode).toBe(0);
					expect(tsxProcess.stdout).toBe(`tsx v${packageJson.version}\nnode v${node.version}`);
					expect(tsxProcess.stderr).toBe('');
				});

				test('doesn\'t show version with file', async () => {
					const tsxProcess = await tsx([
						fixture.getPath('log-argv.ts'),
						'--version',
					]);

					expect(tsxProcess.exitCode).toBe(0);
					expect(tsxProcess.stdout).toMatch('"--version"');
					expect(tsxProcess.stdout).not.toMatch(packageJson.version);
					expect(tsxProcess.stderr).toBe('');
				});
			});

			describe('help', ({ test }) => {
				test('shows help', async () => {
					const tsxProcess = await tsx(['--help']);

					expect(tsxProcess.exitCode).toBe(0);
					expect(tsxProcess.stdout).toMatch('Node.js runtime enhanced with esbuild for loading TypeScript & ESM');
					expect(tsxProcess.stdout).toMatch('Usage: node [options] [ script.js ] [arguments]');
					expect(tsxProcess.stderr).toBe('');
				});

				test('doesn\'t show help with file', async () => {
					const tsxProcess = await tsx([
						fixture.getPath('log-argv.ts'),
						'--help',
					]);

					expect(tsxProcess.exitCode).toBe(0);
					expect(tsxProcess.stdout).toMatch('"--help"');
					expect(tsxProcess.stdout).not.toMatch('tsx');
					expect(tsxProcess.stderr).toBe('');
				});
			});
		});

		describe('eval & print', ({ test }) => {
			test('TypeScript', async () => {
				const tsxProcess = await tsx([
					'--eval',
					'console.log(require("fs") && module as string)',
				]);

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch("id: '[eval]'");
				expect(tsxProcess.stderr).toBe('');
			});

			test('--input-type=module is respected', async () => {
				const tsxProcess = await tsx([
					'--input-type=module',
					'--eval',
					'console.log(typeof require)',
				]);

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toBe('undefined');
				expect(tsxProcess.stderr).toBe('');
			});

			test('--print', async () => {
				const tsxProcess = await tsx([
					'--print',
					'require("fs") && module as string',
				]);

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch("id: '[eval]'");
				expect(tsxProcess.stderr).toBe('');
			});
		});

		if (
			node.supports.cliTestFlag

			// node --test is broken in v20.0.0
			// https://github.com/nodejs/node/issues/48467
			&& node.version !== '20.0.0'
		) {
			test('Node.js test runner', async () => {
				await using fixture = await createFixture({
					'test.ts': `
					import { test } from 'node:test';
					import assert from 'assert';

					test('some passing test', () => {
						assert.strictEqual(1, 1 as number);
					});
					`,
				});

				const tsxProcess = await tsx(
					[
						'--test',
						...(
							node.supports.testRunnerGlob
								? []
								: ['test.ts']
						),
					],
					fixture.path,
				);

				if (node.supports.testRunnerGlob) {
					expect(tsxProcess.stdout).toMatch(/some passing test( \(.+ms\))?\n/);
				} else {
					expect(tsxProcess.stdout).toMatch('# pass 1\n');
				}
				expect(tsxProcess.exitCode).toBe(0);
			}, 10_000);
		}

		describe('Signals', async ({ describe, test, onFinish }) => {
			const signals = ['SIGINT', 'SIGTERM'];
			const fixture = await createFixture({
				'propagates-signal.js': 'process.exit(process.argv[2])',

				'catch-signals.js': `
				const signals = ${JSON.stringify(signals)};
				
				for (const name of signals) {
					process.once(name, () => {
						console.log(name, 'PRESS AGAIN');
						process.once(name, () => {
							process.exit(200);
						});
					});
				}
				
				setTimeout(() => {}, 1e5);
				console.log('READY');				
				`,
				'keep-alive.js': `
				setTimeout(() => {}, 1e5);
				console.log('READY');
				`,
				'infinite-loop.js': `
				console.log(process.pid);
				while (true) {}
				`,
				'ignores-signals.js': `
				console.log(process.pid);
				process.on('SIGINT', () => {
					console.log('Refusing SIGINT');
				});
				process.on('SIGTERM', () => {
					console.log('Refusing SIGTERM');
				});
				setTimeout(() => {}, 1e5);
				`,
				'hidden-signals-handler.js': `
				console.log('process.listeners().length = ' + process.listeners('SIGINT').length);
				console.log('process.listenerCount() = ' + process.listenerCount('SIGINT'));
				`,
			});
			onFinish(async () => await fixture.rm());

			test('Propagates signal', async () => {
				const exitCode = Math.floor(Math.random() * 100);
				const tsxProcess = await tsx([
					fixture.getPath('propagates-signal.js'),
					exitCode.toString(),
				]);
				expect(tsxProcess.exitCode).toBe(exitCode);
			}, 10_000);

			describe('Relays kill signal', ({ test }) => {
				for (const signal of signals) {
					test(signal, async ({ onTestFail }) => {
						const tsxProcess = tsx([
							fixture.getPath('catch-signals.js'),
						]);

						tsxProcess.stdout!.once('data', () => {
							tsxProcess.kill(signal, {
								forceKillAfterTimeout: false,
							});

							tsxProcess.stdout!.once('data', () => {
								tsxProcess.kill(signal, {
									forceKillAfterTimeout: false,
								});
							});
						});

						const tsxProcessResolved = await tsxProcess;

						onTestFail(() => {
							console.log(tsxProcessResolved);
						});

						if (process.platform === 'win32') {
							/**
							 * Windows doesn't support sending signals to processes.
							 * https://nodejs.org/api/process.html#signal-events
							 *
							 * Sending SIGINT, SIGTERM, and SIGKILL will cause the unconditional termination
							 * of the target process, and afterwards, subprocess will report that the process
							 * was terminated by signal.
							 */
							expect(tsxProcessResolved.stdout).toBe('READY');
						} else {
							expect(tsxProcessResolved.exitCode).toBe(200);
							expectMatchInOrder(tsxProcessResolved.stdout, [
								'READY\n',
								`${signal} PRESS AGAIN`,
							]);
						}
					}, {
						timeout: 10_000,
						retry: 3,
					});
				}
			});

			test('Kills child when unresponsive (infinite loop)', async () => {
				const tsxProcess = tsx([
					fixture.getPath('infinite-loop.js'),
				]);

				const childPid = await new Promise<number>((resolve) => {
					tsxProcess.stdout!.once('data', (data) => {
						resolve(Number(data.toString()));
					});
				});

				tsxProcess.kill('SIGINT', {
					forceKillAfterTimeout: false,
				});

				const result = await tsxProcess;

				/**
				 * https://nodejs.org/api/process.html#signal-events
				 * Sending SIGINT, SIGTERM, and SIGKILL will cause the unconditional termination of
				 * the target process, and afterwards, subprocess will report that the process was
				 * terminated by signal.
				 */
				if (process.platform !== 'win32') {
					// This is the exit code I get from testing manually with Node
					expect(result.exitCode).toBe(130);
				}

				// Enforce that child process is killed
				expect(isProcessAlive(childPid!)).toBe(false);
			}, 10_000);

			test('Doesn\'t kill child when responsive (ignores signal)', async () => {
				const tsxProcess = tsx([
					fixture.getPath('ignores-signals.js'),
				]);

				const childPid = await new Promise<number>((resolve) => {
					tsxProcess.stdout!.once('data', (data) => {
						resolve(Number(data.toString()));
					});
				});

				// Send SIGINT to child
				tsxProcess.kill('SIGINT', {
					forceKillAfterTimeout: false,
				});

				await setTimeout(500);

				if (process.platform === 'win32') {
					expect(isProcessAlive(childPid!)).toBe(false);
				} else {
					expect(isProcessAlive(childPid!)).toBe(true);
					process.kill(childPid!, 'SIGKILL');
					// Note: SIGKILLing tsx process will leave the child hanging

					const result = await tsxProcess;

					// This is the exit code I get from testing manually with Node
					expect(result.exitCode).toBe(137);
				}
			}, {
				timeout: 10_000,
				retry: 3,
			});

			test('Relay signal handlers are properly hidden', async () => {
				const tsxProcess = tsx([
					fixture.getPath('hidden-signals-handler.js'),
				]);

				const result = await tsxProcess;

				expect(result.stdout).toBe('process.listeners().length = 0\nprocess.listenerCount() = 0');
				expect(result.exitCode).toBe(0);
			});

			describe('Ctrl + C', ({ test }) => {
				const CtrlC = '\u0003';

				test('Exit code', async ({ onTestFail }) => {
					const shell = ptyShell();

					onTestFail(() => {
						console.log({ stdout: shell.getOutput() });
					});

					await shell.waitForPrompt();
					// Windows doesn't support shebangs
					shell.type(`${node.path} ${tsxPath} ${fixture.getPath('keep-alive.js')}`);

					await shell.waitForLine(/READY/);
					shell.press(CtrlC);

					await shell.waitForPrompt();
					shell.type(`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}`);

					await shell.waitForPrompt();

					expect(await shell.close()).toMatch(/EXIT_CODE:\s+130/);
				}, 10_000);

				test('Catchable', async ({ onTestFail }) => {
					const shell = ptyShell();

					onTestFail(() => {
						console.log({ stdout: shell.getOutput() });
					});

					await shell.waitForPrompt();
					shell.type(`${node.path} ${tsxPath} ${fixture.getPath('catch-signals.js')}`);

					await shell.waitForLine(/READY/);
					shell.press(CtrlC);

					await shell.waitForLine(/PRESS AGAIN/);
					shell.press(CtrlC);

					await shell.waitForPrompt();
					shell.type(`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}`);

					await shell.waitForPrompt();

					expectMatchInOrder(await shell.close(), [
						'READY\r\n',
						process.platform === 'win32' ? '' : '^C',
						'SIGINT PRESS AGAIN\r\n',
						/EXIT_CODE:\s+200/,
					]);
				}, {
					timeout: 10_000,
					retry: 3,
				});

				test('Infinite loop', async ({ onTestFail }) => {
					const shell = ptyShell();

					onTestFail(() => {
						console.log({ stdout: shell.getOutput() });
					});

					await shell.waitForPrompt();
					// Windows doesn't support shebangs
					shell.type(`${node.path} ${tsxPath} ${fixture.getPath('infinite-loop.js')}`);

					await shell.waitForLine(/^\r?\d+$/);
					shell.press(CtrlC);

					await shell.waitForPrompt();
					shell.type(`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}`);

					await shell.waitForPrompt();

					expect(await shell.close()).toMatch(/EXIT_CODE:\s+130/);
				}, 10_000);
			});
		});

		test('relays ipc message to child and back', async () => {
			await using fixture = await createFixture({
				'file.js': `
				process.on('message', (received) => {
					process.send('goodbye');
					process.exit();
				});
				`,
			});

			const tsxProcess = tsx(['file.js'], {
				cwd: fixture.path,
				stdio: ['ipc'],
				reject: false,
			});

			tsxProcess.send('hello');
			const received = await new Promise((resolve) => {
				tsxProcess.once('message', resolve);
			});
			expect(received).toBe('goodbye');

			await tsxProcess;
		});
	});
});
