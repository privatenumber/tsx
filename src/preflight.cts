import { constants as osConstants } from 'os';
import './suppress-warnings.cts';

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
		if (process.rawListeners(signal).length === 1) {
			process.stdin.write('\n');

			// eslint-disable-next-line unicorn/no-process-exit
			process.exit(128 + osConstants.signals[signal]);
		}
	}

	process.on('SIGINT', relaySignal);
	process.on('SIGTERM', relaySignal);
}
