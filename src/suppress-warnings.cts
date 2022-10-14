import { constants as osConstants } from 'os';

const ignoreWarnings = new Set([
	'--experimental-loader is an experimental feature. This feature could change at any time',
	'Custom ESM Loaders is an experimental feature. This feature could change at any time',
]);

const { emit } = process;

// @ts-expect-error emit type mismatch
process.emit = function (event: 'warning', warning: Error) {
	if (
		event === 'warning'
		&& ignoreWarnings.has(warning.message)
	) {
		return;
	}

	return Reflect.apply(emit, this, arguments);
};

// Move to separate file
function relaySignal(signal: NodeJS.Signals) {
	if (process.send) {
		process.send({
			type: 'kill',
			signal,
		});
	}

	/**
	 * Since we're setting a custom signal handler, we need to emulate the
	 * default behavior when there are no other handlers set
	 */
	if (process.rawListeners(signal).length === 1) {
		process.stdin.write('\n');
		process.exit(128 + osConstants.signals[signal]);
	}
}

process.on('SIGINT', relaySignal);
process.on('SIGTERM', relaySignal);
