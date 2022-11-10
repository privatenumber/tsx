import path from 'path';
import { testSuite, expect } from 'manten';
import packageJson from '../../package.json';
import { tsx, tsxPath } from '../utils/tsx';
import { ptyShell, isWindows } from '../utils/pty-shell';

export default testSuite(({ describe }, fixturePath: string) => {
	describe('CLI', ({ describe, test }) => {
		test('passes down flags', async () => {
			const tsxProcess = await tsx({
				args: [
					path.join(fixturePath, 'log-argv.ts'),
					'-vvv',
				],
			});

			expect(tsxProcess.exitCode).toBe(0);
			expect(tsxProcess.stdout).toMatch('.ts","-vvv"]');
			expect(tsxProcess.stderr).toBe('');
		});

		describe('version', ({ test }) => {
			test('shows version', async () => {
				const tsxProcess = await tsx({
					args: ['--version'],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toBe(`tsx v${packageJson.version}\nnode ${process.version}`);
				expect(tsxProcess.stderr).toBe('');
			});

			test('doesn\'t show version with file', async () => {
				const tsxProcess = await tsx({
					args: [
						path.join(fixturePath, 'log-argv.ts'),
						'--version',
					],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch('"--version"');
				expect(tsxProcess.stdout).not.toMatch(packageJson.version);
				expect(tsxProcess.stderr).toBe('');
			});
		});

		describe('help', ({ test }) => {
			test('shows help', async () => {
				const tsxProcess = await tsx({
					args: ['--help'],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch('Node.js runtime enhanced with esbuild for loading TypeScript & ESM');
				expect(tsxProcess.stdout).toMatch('Usage: node [options] [ script.js ] [arguments]');
				expect(tsxProcess.stderr).toBe('');
			});

			test('doesn\'t show help with file', async () => {
				const tsxProcess = await tsx({
					args: [
						path.join(fixturePath, 'log-argv.ts'),
						'--help',
					],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch('"--help"');
				expect(tsxProcess.stdout).not.toMatch('tsx');
				expect(tsxProcess.stderr).toBe('');
			});
		});

		test('Node.js test runner', async () => {
			const tsxProcess = await tsx({
				args: [
					'--test',
					path.join(fixturePath, 'test-runner-file.ts'),
				],
			});

			expect(tsxProcess.stdout).toMatch('# pass 1\n');
			expect(tsxProcess.exitCode).toBe(0);
		}, 10_000);

		describe('Relays kill signal', ({ test }) => {
			const signals = ['SIGINT', 'SIGTERM'];

			for (const signal of signals) {
				test(signal, async () => {
					const tsxProcess = tsx({
						args: [
							path.join(fixturePath, 'catch-signals.js'),
						],
					});

					tsxProcess.stdout!.once('data', () => {
						tsxProcess.kill(signal, {
							forceKillAfterTimeout: false,
						});
					});

					const tsxProcessResolved = await tsxProcess;

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
						expect(tsxProcessResolved.stdout).toBe(`READY\n${signal}\n${signal} HANDLER COMPLETED`);
					}
				}, 10_000);
			}
		});

		describe('Ctrl + C', ({ test }) => {
			test('Exit code', async () => {
				const output = await ptyShell(
					[
						`${process.execPath} ${tsxPath} ./tests/fixtures/keep-alive.js\r`,
						stdout => stdout.includes('READY') && '\u0003',
						`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}\r`,
					],
				);
				expect(output).toMatch(/EXIT_CODE:\s+130/);
			}, 10_000);

			test('Catchable', async () => {
				const output = await ptyShell(
					[
						`${process.execPath} ${tsxPath} ./tests/fixtures/catch-signals.js\r`,
						stdout => stdout.includes('READY') && '\u0003',
						`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}\r`,
					],
				);

				expect(output).toMatch(
					process.platform === 'win32'
						? 'READY\r\nSIGINT\r\nSIGINT HANDLER COMPLETED\r\n'
						: 'READY\r\n^CSIGINT\r\nSIGINT HANDLER COMPLETED\r\n',
				);
				expect(output).toMatch(/EXIT_CODE:\s+200/);
			}, 10_000);
		});
	});
});
