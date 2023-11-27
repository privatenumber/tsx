import { constants as osConstants } from 'os';
import { isMainThread } from 'node:worker_threads';
import { connectingToServer } from './utils/ipc/client.js';
import './suppress-warnings.cjs';

type BaseEventListener = () => void;

const bindHiddenSignalsHandler = (
	signals: NodeJS.Signals[],
	handler: NodeJS.SignalsListener,
) => {
	type RelaySignals = typeof signals[number];
	for (const signal of signals) {
		process.on(signal, (receivedSignal) => {
			handler(receivedSignal);

			/**
			 * Since we're setting a custom signal handler, we need to emulate the
			 * default behavior when there are no other handlers set
			 */
			if (process.listenerCount(signal) === 0) {
				process.exit(128 + osConstants.signals[signal]);
			}
		});
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

/**
 * Seems module.register() calls the loader with the same Node arguments
 * which causes this preflight to be loaded in the loader thread
 */
if (isMainThread) {
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

	(async () => {
		const sendToParent = await connectingToServer;

		if (sendToParent) {
			bindHiddenSignalsHandler(['SIGINT', 'SIGTERM'], (signal: NodeJS.Signals) => {
				sendToParent({
					type: 'signal',
					signal,
				});
			});
		}
	})();
}
