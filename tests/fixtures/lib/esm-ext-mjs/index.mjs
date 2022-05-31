import fs from 'node:fs';

console.log(
	'loaded esm-ext-mjs/index.mjs',
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

export default 1234;
