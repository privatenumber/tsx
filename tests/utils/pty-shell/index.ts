import { fileURLToPath } from 'url';
import { execaNode } from 'execa';
import stripAnsi from 'strip-ansi';

export const isWindows = process.platform === 'win32';
const shell = isWindows ? 'powershell.exe' : 'bash';
const commandCaret = `${isWindows ? '>' : '$'} `;

type ConditionalStdin = (outChunk: string) => string | false;
type StdInArray = (string | ConditionalStdin)[];

const getStdin = (
	stdins: StdInArray,
): ConditionalStdin | undefined => {
	const stdin = stdins.shift();
	return (
		typeof stdin === 'string'
			? outChunk => outChunk.includes(commandCaret) && stdin
			: stdin
	);
};

export const ptyShell = (
	stdins: StdInArray,
) => new Promise<string>((resolve, reject) => {
	const childProcess = execaNode(
		fileURLToPath(new URL('node-pty.mjs', import.meta.url)),
		[shell],
		{
			stdio: 'pipe',
		},
	);

	childProcess.on('error', reject);

	let currentStdin = getStdin(stdins);

	let buffer = Buffer.alloc(0);
	childProcess.stdout!.on('data', (data) => {
		buffer = Buffer.concat([buffer, data]);
		const outString = stripAnsi(data.toString());

		if (currentStdin) {
			const stdin = currentStdin(outString);
			if (stdin) {
				childProcess.send(stdin);
				currentStdin = getStdin(stdins);
			}
		} else if (outString.includes(commandCaret)) {
			childProcess.kill();
		}
	});

	childProcess.stderr!.on('data', (data) => {
		reject(new Error(stripAnsi(data.toString())));
	});

	childProcess.on('exit', () => {
		const outString = stripAnsi(buffer.toString());
		resolve(outString);
	});
});
