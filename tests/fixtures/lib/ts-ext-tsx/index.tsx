import fs from 'node:fs';

console.log(
	'loaded ts-ext-tsx/index.tsx',
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
					sourceMap: error.stack.includes(':11:5'),
				};
			}
		})(),
	}),
);

const React = {
	createElement: (...args) => Array.from(args),
};

export default (<div>hello world</div>);
