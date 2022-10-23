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
) => new Promise((resolve, reject) => {
	const childProcess = execaNode(
		fileURLToPath(new URL('node-pty.mjs', import.meta.url)),
		[shell],
		{
			stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
		},
	);

	childProcess.on('error', reject);

	let currentStdin = getStdin(stdins);

	const output: Buffer[] = [];
	childProcess.stdout!.on('data', (data) => {
		output.push(data);
		const outString = data.toString();

		if (currentStdin) {
			const stdin = currentStdin(outString);
			if (stdin) {
				childProcess.send(stdin);
				currentStdin = getStdin(stdins);
			}
		} else if (outString.includes(commandCaret)) {
			childProcess.kill('SIGTERM');
		}
	});

	childProcess.stderr!.on('data', (data) => {
		reject(new Error(stripAnsi(data.toString())));
	});

	childProcess.on('exit', () => {
		let outString = Buffer.concat(output).toString();
		outString = stripAnsi(outString);
		resolve(outString);
	});
});
