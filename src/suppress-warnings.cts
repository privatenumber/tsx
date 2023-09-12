// Deprecated: Move to preflight.cts & delete entry-point in next major

const ignoreWarnings = new Set([
	'--experimental-loader is an experimental feature. This feature could change at any time',
	'Custom ESM Loaders is an experimental feature. This feature could change at any time',

	// Changed in Node v18.13.0 via https://github.com/nodejs/node/pull/45424
	'Custom ESM Loaders is an experimental feature and might change at any time',

	// For JSON modules via https://github.com/nodejs/node/pull/46901
	'Import assertions are not a stable feature of the JavaScript language. Avoid relying on their current behavior and syntax as those might change in a future version of Node.js.',

	'`globalPreload` is planned for removal in favor of `initialize`. `globalPreload` is an experimental feature and might change at any time',
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
