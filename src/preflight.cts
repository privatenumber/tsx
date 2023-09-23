import { constants as osConstants } from 'os';
import './suppress-warnings.cts';

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

// If a parent process is detected
if (process.send) {
	function relaySignal(signal: NodeJS.Signals) {
		process.send!({
			type: 'kill',
			signal,
		});

		/**
		 * Since we're setting a custom signal handler, we need to emulate the
		 * default behavior when there are no other handlers set
		 */
		if (process.listenerCount(signal) === 0) {
			process.exit(128 + osConstants.signals[signal]);
		}
	}

	const relaySignals = ['SIGINT', 'SIGTERM'] as const;
	type RelaySignals = typeof relaySignals[number];
	for (const signal of relaySignals) {
		process.on(signal, relaySignal);
	}

	// Reduce the listenerCount to hide the one set above
	const { listenerCount } = process;
	process.listenerCount = function (eventName) {
		let count = Reflect.apply(listenerCount, this, arguments);
		if (relaySignals.includes(eventName as RelaySignals)) {
			count -= 1;
		}
		return count;
	};

	// Also hide relaySignal from process.listeners()
	const { listeners } = process;
	process.listeners = function (eventName) {
		const result: BaseEventListener[] = Reflect.apply(listeners, this, arguments);
		if (relaySignals.includes(eventName as RelaySignals)) {
			return result.filter(listener => listener !== relaySignal);
		}
		return result;
	};
}
