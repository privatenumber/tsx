import path from 'path';
import { testSuite, expect } from 'manten';
import packageJson from '../../package.json';
import { tsx, tsxPath } from '../utils/tsx';
import { ptyShell, isWindows } from '../utils/pty-shell';

export default testSuite(({ describe }, fixturePath: string) => {
	describe('CLI', ({ describe }) => {
		// describe('version', ({ test }) => {
		// 	test('shows version', async () => {
		// 		const tsxProcess = await tsx({
		// 			args: ['--version'],
		// 		});

		// 		expect(tsxProcess.exitCode).toBe(0);
		// 		expect(tsxProcess.stdout).toBe(packageJson.version);
		// 		expect(tsxProcess.stderr).toBe('');
		// 	});

		// 	test('doesn\'t show version with file', async () => {
		// 		const tsxProcess = await tsx({
		// 			args: [
		// 				path.join(fixturePath, 'log-argv.ts'),
		// 				'--version',
		// 			],
		// 		});

		// 		expect(tsxProcess.exitCode).toBe(0);
		// 		expect(tsxProcess.stdout).toMatch('"--version"');
		// 		expect(tsxProcess.stderr).toBe('');
		// 	});
		// });

		// describe('help', ({ test }) => {
		// 	test('shows help', async () => {
		// 		const tsxProcess = await tsx({
		// 			args: ['--help'],
		// 		});

		// 		expect(tsxProcess.exitCode).toBe(0);
		// 		expect(tsxProcess.stdout).toMatch('Node.js runtime enhanced with esbuild for loading TypeScript & ESM');
		// 		expect(tsxProcess.stderr).toBe('');
		// 	});

		// 	test('doesn\'t show help with file', async () => {
		// 		const tsxProcess = await tsx({
		// 			args: [
		// 				path.join(fixturePath, 'log-argv.ts'),
		// 				'--help',
		// 			],
		// 		});

		// 		expect(tsxProcess.exitCode).toBe(0);
		// 		expect(tsxProcess.stdout).toMatch('"--help"');
		// 		expect(tsxProcess.stderr).toBe('');
		// 	});
		// });

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
				}, 5000);
			}
		});

		describe('Handles kill signal from shell', ({ test }) => {
			// type Command = {
			// 	command: string;
			// 	output: string;
			// };

			// const isWindows = process.platform === 'win32';
			// const shell = isWindows ? 'powershell.exe' : 'bash';
			// const commandCaret = (isWindows ? '>' : '$') + ' ';

			// const spawnShell = (
			// 	initCommand: string,
			// 	callback: (outChunk: string, shell: IPty) => void,
			// ) => new Promise((resolve, reject) => {
			// 	const commands: Command[] = [
			// 		initCommand,
			// 		`echo ${isWindows ? '$LastExitCode' : '$?'}`,
			// 	].map(command => ({ command, output: '' }));
			// 	let currentCommand = -1;

			// 	const shellProcess = spawn(shell, [], { cols: 1000 });

			// 	shellProcess.onData((data) => {
			// 		if (data.includes(commandCaret)) {
			// 			if (currentCommand === commands.length - 1) {

			// 				// Using pty's `kill` method errors on Windows
			// 				process.kill(shellProcess.pid, 'SIGKILL');
			// 			} else {
			// 				currentCommand += 1;
			// 				shellProcess.write(`${commands[currentCommand].command}\r`);	
			// 			}

			// 			const newLine = data.lastIndexOf('\n', data.indexOf(commandCaret));
			// 			if (newLine === -1) {
			// 				return;
			// 			}
			// 			data = data.slice(0, newLine);
			// 		}

			// 		// If initialized
			// 		if (currentCommand > -1) {
			// 			callback(data, shellProcess);
			// 			commands[currentCommand].output += data;
			// 		}
			// 	});

			// 	shellProcess.onExit(() => {
			// 		const [out, exitCode] = commands.map(
			// 			({ command, output }) => stripAnsi(output).split(command + '\r\n')[1],
			// 		);

			// 		resolve({
			// 			out,
			// 			exitCode: Number(exitCode.trim()),
			// 		});
			// 	});
			// });

			// TODO: Add test for SIGINT on Node.js script without handler
			test('Ctrl + C', async () => {
				const output = await ptyShell(
					[
						`${process.execPath} ./tests/fixtures/catch-signals.js\r`,
						(stdout) => stdout === 'READY\r\n' && '\x03',
						`echo EXIT_CODE: ${isWindows ? '$LastExitCode' : '$?'}\r`,
					],
				);
				
				console.log({output});

				expect(output).toMatch(
					process.platform === 'win32'
						? 'READY\r\nSIGINT\r\nSIGINT HANDLER COMPLETED\r\n'
						: 'READY\r\n^CSIGINT\r\nSIGINT HANDLER COMPLETED\r\n'
				);
				expect(output).toMatch(/EXIT_CODE:\s+200/);
			});
		});
	});
});
