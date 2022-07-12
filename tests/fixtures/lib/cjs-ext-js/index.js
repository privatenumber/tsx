async function test(description, testFunction) {
	try {
		const result = await testFunction();
		if (!result) { throw result; }
		console.log(`✔ ${description}`);
	} catch (error) {
		console.log(`✖ ${description}: ${error.toString().split('\n').shift()}`);
	}
}

console.log('loaded cjs-ext-js/index.js');

test(
	'has CJS context',
	() => typeof require !== 'undefined' || typeof module !== 'undefined',
);

// esbuild uses import.meta as a signal for ESM
// test(
// 	'import.meta.url',
// 	() => Boolean(import.meta.url),
// );

test(
	'name in error',
	() => {
		let nameInError;
		try {
			nameInError();
		} catch (error) {
			return error.message.includes('nameInError');
		}
	},
);

test(
	'sourcemaps',
	() => new Error().stack.includes(':38:'),
);

test(
	'resolves optional node prefix',
	() => Boolean(require('node:fs')),
);

test(
	'resolves required node prefix',
	() => Boolean(require('node:test')),
);

test(
	'has dynamic import',
	() => import('fs').then(Boolean),
);

test(
	'module exports',
	() => module.exports = 1234,
);
