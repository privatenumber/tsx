import { setTimeout } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { execaNode, type NodeOptions } from 'execa';
import stripAnsi from 'strip-ansi';
import split from 'split2';

export const isWindows = process.platform === 'win32';
const shell = isWindows ? 'powershell.exe' : 'bash';
const commandCaret = `${isWindows ? '>' : '$'} `;

type ConditionalStdin = (outChunk: string) => string | false;
type StdInArray = (string | ConditionalStdin)[];

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
	options?: NodeOptions<'utf8'> & { debug?: string },
) => {
	const childProcess = execaNode(
		fileURLToPath(new URL('node-pty.mjs', import.meta.url)),
		[shell],
		{
			...options,
			stdio: 'pipe',
		},
	);

	let currentStdin = stdins.shift();

	let buffer = Buffer.alloc(0);
	childProcess.stdout!.on('data', (data) => {
		buffer = Buffer.concat([buffer, data]);
		if (buffer.toString().endsWith(commandCaret)) {
			if (!currentStdin) {
				childProcess.kill();
			} else if (typeof currentStdin === 'string') {
				if (options?.debug) {
					console.log({
						name: options.debug,
						send: currentStdin,
					});
				}

				childProcess.send(currentStdin);
				currentStdin = stdins.shift();
			}
		}
	});

	childProcess.stdout!.pipe(split()).on('data', (line) => {
		line = stripAnsi(line);

		if (options?.debug) {
			console.log({ line });
		}

		if (typeof currentStdin === 'function') {
			const send = currentStdin(line);
			if (send) {
				if (options?.debug) {
					console.log({
						name: options.debug,
						send,
					});
				}
				childProcess.send(send);
				currentStdin = stdins.shift();
			}
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
		promises.push(
			throwTimeout(timeout, abortController).catch((error) => {
				childProcess.kill();

				if (options?.debug) {
					const outString = stripAnsi(buffer.toString());
					console.log('Incomplete output', {
						name: options.debug,
						outString,
						stdins,
					});
				}

				throw error;
			}),
		);
	}

	try {
		await Promise.race(promises);
	} finally {
		abortController.abort();
	}

	return stripAnsi(buffer.toString());
};
