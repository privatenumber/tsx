// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-explicit-any */
import { constants as osConstants } from 'os';
import './suppress-warnings.cts';

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
require('@esbuild-kit/cjs-loader');

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		interface Process {
			channel: RefCounted;
		}
	}
}
// If a parent process is detected
if (process.send) {
	// Can happen if parent process is disconnected, but most likely
	// it was because parent process was killed via SIGQUIT
	const exitOnDisconnect = () => {
		// the exit code doesn't matter, as the parent's exit code is the
		// one that is returned, and has already been returned by now.
		// If this is not performed, the process will continue to run
		// detached from the parent.
		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	};
	process.on('disconnect', exitOnDisconnect);
	process.channel.unref();

	function relay(signal: NodeJS.Signals) {
		/**
		 * Since we're setting a custom signal handler, we need to emulate the
		 * default behavior when there are no other handlers set
		 */
		if (process.listenerCount(signal) === 0) {
			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(128 + osConstants.signals[signal]);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			process.send!({
				type: 'signal',
				signal,
			});
		}
	}

	const relaySignals = ['SIGINT', 'SIGTERM'] as const;
	for (const signal of relaySignals) {
		process.on(signal, relay);
	}

	// Reduce the listenerCount to hide the one set above
	const { listenerCount } = process;
	process.listenerCount = function hideTsxListenerCount(eventName) {
		let count = Reflect.apply(listenerCount, this, arguments);
		if (relaySignals.includes(eventName as any)) {
			count -= 1;
		}
		return count;
	};

	// Also hide relay from process.listeners()
	const { listeners } = process;
	process.listeners = function hideTsxListeners(eventName) {
		const result = Reflect.apply(listeners, this, arguments);
		if (relaySignals.includes(eventName as any)) {
			return result.filter((listener: any) => listener !== relay);
		}
		return result;
	};

	process.once('exit', () => {
		// Internally, node has a signal listener at C-level. This listener
		// is cleaned up when the last JS-level signal listener is removed.
		// However, node uses process.listenerCount to determine if it should
		// stop listening. If we don't remove our modifications to process.listenerCount
		// then we interfere with node's cleanup routines.
		process.listeners = listeners;
		process.listenerCount = listenerCount;
		for (const signal of relaySignals) {
			process.off(signal, relay);
		}
	});
}
