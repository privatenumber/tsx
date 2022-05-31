const fs = require('node:fs');

console.log(
	'loaded cjs-ext-js/index.js',
	JSON.stringify({
		nodePrefix: Boolean(fs),
		hasDynamicImport: Boolean(import('fs')),
		dirname: typeof __dirname === 'string',
		...(() => {
			let nameInError;
			try {
				nameInError();
			} catch (error) {
				return {
					nameInError: error.message.includes('nameInError'),
					sourceMap: error.stack.includes(':12:5'),
				};
			}
		})(),
	}),
);

module.exports = 1234;
