import type { Readable } from 'node:stream';
import { on } from 'node:events';
import { setTimeout } from 'node:timers/promises';

type MaybePromise<T> = T | Promise<T>;

export const processInteract = async (
	stdout: Readable,
	actions: ((data: string) => MaybePromise<boolean | void>)[],
	timeout: number,
) => {
	const startTime = Date.now();
	const logs: [time: number, string][] = [];

	let currentAction = actions.shift();

	const ac = new AbortController();
	setTimeout(timeout, true, ac).then(
		() => {
			if (currentAction) {
				console.error(`Timeout ${timeout}ms exceeded:`);
				console.log(logs);
			}
		},
		() => {},
	);

	while (currentAction) {
		for await (const [chunk] of on(stdout, 'data')) {
			const chunkString = chunk.toString();
			logs.push([
				Date.now() - startTime,
				chunkString,
			]);

			const gotoNextAction = await currentAction(chunkString);
			if (gotoNextAction) {
				currentAction = actions.shift();
				break;
			}
		}
	}
	ac.abort();
};
