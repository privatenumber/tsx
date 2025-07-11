import { fileURLToPath } from 'node:url';
import { execaNode, type NodeOptions } from 'execa';
import stripAnsi from 'strip-ansi';

export const isWindows = process.platform === 'win32';
const shell = isWindows ? 'powershell.exe' : 'bash';
const commandCaret = `${isWindows ? '>' : '$'} `;

class Deferred<T> {
	promise: Promise<T>;

	resolve!: (value: T | PromiseLike<T>) => void;

	reject!: (reason?: unknown) => void;

	constructor() {
		this.promise = new Promise<T>((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}
}

type API = {
	waitForPrompt: () => Promise<void>;
	waitForLine: (match: RegExp) => Promise<string>;
	type: (text: string) => void;
	press: (key: string) => void;
};

export const ptyShell = (
	callback: (api: API) => Promise<void>,
	options?: NodeOptions<'utf8'>,
) => {
	const timeStart = Date.now();
	const logs: string[] = [];
	const log = (...messages: any[]) => {
		logs.push(`[${Date.now() - timeStart}ms] ${messages.map(message => JSON.stringify(message)).join(' ')}`);
	};

	const childProcess = execaNode(
		fileURLToPath(new URL('node-pty.mjs', import.meta.url)),
		[shell],
		{
			...options,
			stdio: 'pipe',
		},
	);

	let promptDeferred: Deferred<void> | undefined;
	const lineMap = new Map<RegExp, Deferred<string>>();

	const onLine = (line: string) => {
		for (const [pattern, deferred] of lineMap.entries()) {
			if (pattern.test(line)) {
				deferred.resolve(line);
				lineMap.delete(pattern);

				log('line', line);
			}
		}
	};

	let buffer = '';
	let lineBuffer = '';

	childProcess.stdout!.on('data', (chunk: Buffer) => {
		const chunkString = chunk.toString();
		buffer += chunkString;
		lineBuffer += chunkString;

		// Check for prompt
		if (buffer.endsWith(commandCaret) && promptDeferred) {
			promptDeferred.resolve();
			promptDeferred = undefined;
			log('prompt');
		}

		// Extract only new lines from the stream
		let newlineIndex = lineBuffer.indexOf('\n');
		while (newlineIndex >= 0) {
			const rawLine = lineBuffer.slice(0, newlineIndex).replace(/\r$/, '');
			lineBuffer = lineBuffer.slice(newlineIndex + 1);
			onLine(stripAnsi(rawLine));

			newlineIndex = lineBuffer.indexOf('\n');
		}
	});

	const onExit = new Promise<void>((resolve) => {
		childProcess.on('exit', () => {
			log('child process exited');
			resolve();
		});
	});

	const output = (async () => {
		await callback({
			waitForPrompt: () => {
				log('waitForPrompt');
				promptDeferred = new Deferred<void>();
				return promptDeferred.promise;
			},
			waitForLine: (pattern) => {
				log('waitForLine', pattern.toString());
				const deferred = new Deferred<string>();
				lineMap.set(pattern, deferred);
				return deferred.promise;
			},
			type: (text) => {
				log('type', text);
				childProcess.stdin!.write(`${text}\r`);
			},
			press: (key) => {
				log('press', key);
				childProcess.stdin!.write(key);
			},
		});

		childProcess.kill();

		await onExit;

		return stripAnsi(buffer);
	})();

	return Object.assign(childProcess, {
		output,
		logs,
		getStdout: () => buffer,
	});
};
