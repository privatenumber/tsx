import path from 'path';
import { setTimeout } from 'timers/promises';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import packageJson from '../../package.json';
import { tsxPath } from '../utils/tsx.js';
import { ptyShell, isWindows } from '../utils/pty-shell/index';
import { expectMatchInOrder } from '../utils/expect-match-in-order.js';
import type { NodeApis } from '../utils/tsx.js';
import { compareNodeVersion, type Version } from '../../src/utils/node-features.js';

const isProcessAlive = (pid: number) => {
	try {
		process.kill(pid, 0);
		return true;
	} catch {}
	return false;
};

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
						path.join(fixture.path, 'log-argv.ts'),
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
						path.join(fixture.path, 'log-argv.ts'),
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

		const nodeVersion = node.version.split('.').map(Number) as Version;

		// https://nodejs.org/docs/latest-v18.x/api/cli.html#--test
		const cliTestFlag = compareNodeVersion([18, 1, 0], nodeVersion) >= 0;
		const testRunnerGlob = compareNodeVersion([21, 0, 0], nodeVersion) >= 0;
		if (cliTestFlag) {
			test('Node.js test runner', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'test.ts': `
					import { test } from 'node:test';
					import assert from 'assert';

					test('some passing test', () => {
						assert.strictEqual(1, 1);
					});
					`,
				});
				onTestFinish(async () => await fixture.rm());

				const tsxProcess = await tsx(
					[
						'--test',
						...(
							testRunnerGlob
								? []
								: ['test.ts']
						),
					],
					fixture.path,
				);

				expect(tsxProcess.exitCode).toBe(0);
				if (testRunnerGlob) {
					expect(tsxProcess.stdout).toMatch('some passing test\n');
				} else {
					expect(tsxProcess.stdout).toMatch('# pass 1\n');
				}
			}, 10_000);
		}

		describe('Signals', async ({ describe, onFinish }) => {
			const signals = ['SIGINT', 'SIGTERM'];
			const fixture = await createFixture({
				'catch-signals.js': `
				const signals = ${JSON.stringify(signals)};
				
				for (const name of signals) {
					process.on(name, () => {
						console.log(name);
				
						setTimeout(() => {
							console.log(name, 'HANDLER COMPLETED');
							process.exit(200);
						}, 100);
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
			});
			onFinish(async () => await fixture.rm());

			describe('Relays kill signal', ({ test }) => {
				for (const signal of signals) {
					test(signal, async ({ onTestFail }) => {
						const tsxProcess = tsx([
							path.join(fixture.path, 'catch-signals.js'),
						]);

						tsxProcess.stdout!.once('data', () => {
							tsxProcess.kill(signal, {
								forceKillAfterTimeout: false,
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
								`${signal}\n`,
								`${signal} HANDLER COMPLETED`,
							]);
						}
					}, 10_000);
				}
			});

			test('Kills child when unresponsive (infinite loop)', async () => {
				const tsxProcess = tsx([
					path.join(fixture.path, 'infinite-loop.js'),
				]);

				const childPid = await new Promise<number>((resolve) => {
					tsxProcess.stdout!.once('data', (data) => {
						resolve(Number(data.toString()));
					});
				});

				tsxProcess.kill('SIGINT', {
					forceKillAfterTimeout: false,
				});

				await tsxProcess;

				// TODO: Is this correct?
				// expect(result.exitCode).toBe(0);

				// Enforce that child process is killed
				expect(isProcessAlive(childPid!)).toBe(false);
			}, 10_000);

			test('Doesn\'t kill child when responsive (ignores signal)', async () => {
				const tsxProcess = tsx([
					path.join(fixture.path, 'ignores-signals.js'),
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

				await setTimeout(100);

				if (process.platform === 'win32') {
					// Enforce that child process is killed
					expect(isProcessAlive(childPid!)).toBe(false);
				} else {
					// Kill child process
					expect(isProcessAlive(childPid!)).toBe(true);
					process.kill(childPid!, 'SIGKILL');
				}

				await tsxProcess;

				// TODO: Is this correct?
				// expect(result.exitCode).toBe(0);
			}, 10_000);

			describe('Ctrl + C', ({ test }) => {
				test('Exit code', async () => {
					const output = await ptyShell(
						[
							`${node.path} ${tsxPath} ${path.join(fixture.path, 'keep-alive.js')}\r`,
							stdout => stdout.includes('READY') && '\u0003',
							`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}\r`,
						],
					);
					expect(output).toMatch(/EXIT_CODE:\s+130/);
				}, 10_000);

				test('Catchable', async () => {
					const output = await ptyShell(
						[
							`${node.path} ${tsxPath} ${path.join(fixture.path, 'catch-signals.js')}\r`,
							stdout => stdout.includes('READY') && '\u0003',
							`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}\r`,
						],
					);

					expectMatchInOrder(output, [
						'READY\r\n',
						process.platform === 'win32' ? '' : '^C',
						'SIGINT\r\n',
						'SIGINT HANDLER COMPLETED\r\n',
						/EXIT_CODE:\s+200/,
					]);
				}, 10_000);
			});
		});
	});
});
