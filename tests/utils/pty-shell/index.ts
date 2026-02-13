import { spawn, waitFor } from 'pty-spawn';
import stripAnsi from 'strip-ansi';

export const isWindows = process.platform === 'win32';
const shell = isWindows ? 'powershell.exe' : 'bash';
const commandCaret = `${isWindows ? '>' : '$'} `;

export const ptyShell = () => {
	const subprocess = spawn(shell, {
		window: { cols: 1000 },
		reject: false,
	});

	return {
		waitForPrompt: () => waitFor(subprocess, o => o.endsWith(commandCaret)),
		waitForLine: (pattern: RegExp) => waitFor(subprocess, o => (
			stripAnsi(o).split('\n').some(line => pattern.test(line.replace(/\r$/, '')))
		)),
		type: (text: string) => subprocess.stdin.write(`${text}\r`),
		press: (key: string) => subprocess.stdin.write(key),
		close: async () => {
			await subprocess.kill();
			const result = await subprocess;
			return stripAnsi(result.output);
		},
		getOutput: () => subprocess.output,
	};
};
