import { setTimeout } from 'timers/promises';
import { fileURLToPath } from 'url';
import { execaNode, type NodeOptions } from 'execa';
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

const throwTimeout = (
	timeout: number,
	abortController: AbortController,
) => (
	setTimeout(timeout, true, abortController).then(
		() => {
			throw new Error(`Timeout: ${timeout}ms`);
		},
		() => {},
	)
);

export const ptyShell = async (
	stdins: StdInArray,
	timeout?: number,
	options?: NodeOptions<'utf8'>,
) => {
	const childProcess = execaNode(
		fileURLToPath(new URL('node-pty.mjs', import.meta.url)),
		[shell],
		{
			...options,
			stdio: 'pipe',
		},
	);

	let currentStdin = getStdin(stdins);

	let buffer = Buffer.alloc(0);
	childProcess.stdout!.on('data', (data) => {
		buffer = Buffer.concat([buffer, data]);
		const outString = stripAnsi(data.toString());

		if (currentStdin) {
			const stdin = currentStdin(outString);
			if (stdin) {
				console.log({
					outString,
					sending: stdin,
					stdins,
				});
				childProcess.send(stdin);
				currentStdin = getStdin(stdins);
			}
		} else if (outString.includes(commandCaret)) {
			childProcess.kill();
		}
	});

	const abortController = new AbortController();

	const promises = [
		new Promise<void>((resolve, reject) => {
			childProcess.on('error', reject);
			childProcess.stderr!.on('data', (data) => {
				reject(new Error(stripAnsi(data.toString())));
			});
			childProcess.on('exit', resolve);
		}),
	];

	if (typeof timeout === 'number') {
		promises.push(throwTimeout(timeout, abortController));
	}

	try {
		await Promise.race(promises);
	} catch (error) {
		if (error instanceof Error && error.message.startsWith('Timeout')) {
			childProcess.kill();
			const outString = stripAnsi(buffer.toString());

			console.log('Incomplete output', {
				outString,
				stdins,
			});
		}

		throw error;
	} finally {
		abortController.abort();
	}

	return stripAnsi(buffer.toString());
};
