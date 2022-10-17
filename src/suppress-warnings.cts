// Deprecated: Move to preflight.cts & delete entry-point in next major

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
