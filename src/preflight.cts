import { constants as osConstants } from 'os';
import { isMainThread } from 'node:worker_threads';
import { creatingClient } from './utils/ipc/client.js';
import './suppress-warnings.cjs';

type BaseEventListener = () => void;

/**
 * Hook require() to transform to CJS
 *
 * This needs to be loaded via --require flag so subsequent --require
 * flags can support TypeScript.
 *
 * This is also added in loader.ts for the loader API.
 * Although it is required twice, it's not executed twice because
 * it's cached.
 */
// eslint-disable-next-line import/no-unresolved
require('./cjs/index.cjs');

const bindHiddenSignalsHandler = (
	signals: NodeJS.Signals[],
	handler: NodeJS.SignalsListener,
) => {
	type RelaySignals = typeof signals[number];
	for (const signal of signals) {
		process.on(signal, handler);
	}

	/**
	 * Hide relaySignal from process.listeners() and process.listenerCount()
	 */
	const { listenerCount, listeners } = process;

	process.listenerCount = function (eventName) {
		let count = Reflect.apply(listenerCount, this, arguments);
		if (signals.includes(eventName as RelaySignals)) {
			count -= 1;
		}
		return count;
	};

	process.listeners = function (eventName) {
		const result: BaseEventListener[] = Reflect.apply(listeners, this, arguments);
		if (signals.includes(eventName as RelaySignals)) {
			return result.filter(listener => listener !== handler);
		}
		return result;
	};
};

// ESM Loader spawns child with same flags as parent
// TODO: maybe we can also remove these flags?
if (isMainThread) {
	(async () => {
		const sendToClient = await creatingClient;

		bindHiddenSignalsHandler(['SIGINT', 'SIGTERM'], (signal: NodeJS.Signals) => {
			sendToClient({
				type: 'kill',
				signal,
			});

			/**
			 * If the user has not registered a signal handler, we need to emulate
			 * the default behavior when there are no other handlers set
			 */
			if (process.listenerCount(signal) === 0) {
				process.exit(128 + osConstants.signals[signal]);
			}
		});
	})();
}
