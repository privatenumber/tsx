import type { Readable } from 'node:stream';
import { on } from 'node:events';
import { setTimeout } from 'node:timers/promises';
import stripAnsi from 'strip-ansi';

type OnTimeoutCallback = () => void;

type Api = {
	startTime: number;
	onTimeout: (callback: OnTimeoutCallback) => void;
};

const enforceTimeout = <ReturnType>(
	timeout: number,
	function_: (api: Api) => ReturnType,
): ReturnType => {
	const startTime = Date.now();
	let onTimeoutCallback: OnTimeoutCallback;

	const runFunction = function_({
		startTime,
		onTimeout: (callback) => {
			onTimeoutCallback = callback;
		},
	});

	if (!(runFunction instanceof Promise)) {
		return runFunction;
	}

	const ac = new AbortController();
	const timer = setTimeout(timeout, true, ac).then(
		async () => {
			if (onTimeoutCallback) {
				await onTimeoutCallback();
			}

			throw new Error('Timeout');
		},
		() => { /* Timeout aborted */ },
	);

	return Promise.race([
		runFunction.finally(() => ac.abort()),
		timer,
	]) as ReturnType;
};

type MaybePromise<T> = T | Promise<T>;

type ProcessInteractLog = {
	time: number;
	stdout: string;
};

type ProcessInteractContext = {
	chunk: string;
	output: string;
	logs: ProcessInteractLog[];
};

type ProcessInteractAction = (
	context: ProcessInteractContext,
) => MaybePromise<boolean | void>;

export const processInteract = async (
	stdout: Readable,
	actions: ProcessInteractAction[],
	timeout: number,
) => enforceTimeout(timeout, async ({ startTime, onTimeout }) => {
	const logs: ProcessInteractLog[] = [];
	let output = '';
	let actionIndex = 0;
	const createPendingActionError = (
		message: string,
	) => Object.assign(
		new Error(`${message} while waiting for action ${actionIndex + 1}/${actions.length}`),
		{
			logs,
			output,
		},
	);

	stdout.setEncoding('utf8');

	onTimeout(() => {
		if (actionIndex < actions.length) {
			throw createPendingActionError(`Timeout ${timeout}ms exceeded`);
		}
	});

	for await (const [chunk] of on(stdout, 'data', {
		close: ['end', 'close'],
	})) {
		if (actionIndex >= actions.length) {
			break;
		}

		const chunkString = stripAnsi(chunk);
		output += chunkString;
		logs.push({
			time: Date.now() - startTime,
			stdout: chunkString,
		});

		let chunkForAction = chunkString;
		while (actionIndex < actions.length) {
			const gotoNextAction = await actions[actionIndex]({
				chunk: chunkForAction,
				output,
				logs,
			});
			if (!gotoNextAction) {
				break;
			}

			actionIndex += 1;
			chunkForAction = '';
		}

		if (actionIndex >= actions.length) {
			break;
		}
	}

	if (actionIndex < actions.length) {
		throw createPendingActionError('Stream ended');
	}
});
