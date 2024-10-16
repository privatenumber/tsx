import type { Readable } from 'node:stream';
import { on } from 'node:events';
import { setTimeout } from 'node:timers/promises';

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

export const processInteract = async (
	stdout: Readable,
	actions: ((data: string) => MaybePromise<boolean | void>)[],
	timeout: number,
) => enforceTimeout(timeout, async ({ startTime, onTimeout }) => {
	const logs: {
		time: number;
		stdout: string;
	}[] = [];

	let currentAction = actions.shift();

	onTimeout(() => {
		if (currentAction) {
			const error = Object.assign(
				new Error(`Timeout ${timeout}ms exceeded:`),
				{ logs },
			);
			throw error;
		}
	});

	while (currentAction) {
		for await (const [chunk] of on(stdout, 'data')) {
			const chunkString = chunk.toString();
			logs.push({
				time: Date.now() - startTime,
				stdout: chunkString,
			});

			const gotoNextAction = await currentAction(chunkString);
			if (gotoNextAction) {
				currentAction = actions.shift();
				break;
			}
		}
	}
});
