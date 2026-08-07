import { spawn, waitFor } from 'pty-spawn';
import stripAnsi from 'strip-ansi';
import { onTestFinish } from 'manten';

export const isWindows = process.platform === 'win32';
const shell = isWindows ? 'powershell.exe' : 'bash';
const commandCaret = `${isWindows ? '>' : '$'} `;
const normalizeTerminalOutput = (
	output: string,
) => stripAnsi(output)
	.replaceAll('\r', '');

export const ptyShell = () => {
	const subprocess = spawn(shell, {
		window: { cols: 1000 },
		reject: false,
	});

	let closedShell: Promise<string> | undefined;

	const close = () => {
		closedShell ??= (async () => {
			await subprocess.kill({ forceKill: 1000 });
			const result = await subprocess;
			return stripAnsi(result.output);
		})();

		return closedShell;
	};
	// A timed-out callback can remain blocked after Manten starts the next retry.
	onTestFinish(async () => {
		await close();
	});

	return {
		waitForPrompt: () => waitFor(
			subprocess,
			o => normalizeTerminalOutput(o)
				.split('\n')
				.some(line => line.endsWith(commandCaret)),
		),
		waitForLine: (pattern: RegExp) => waitFor(subprocess, o => (
			normalizeTerminalOutput(o).split('\n').slice(0, -1).some(line => pattern.test(line))
		)),
		type: (text: string) => subprocess.stdin.write(`${text}\r`),
		press: (key: string) => subprocess.stdin.write(key),
		close,
		getOutput: () => String(subprocess.output),
		[Symbol.asyncDispose]: async () => {
			await close();
		},
	};
};
