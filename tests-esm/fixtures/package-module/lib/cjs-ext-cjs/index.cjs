async function test(description, testFunction) {
	try {
		const result = await testFunction();
		if (!result) { throw result; }
		console.log(`✔ ${description}`);
	} catch (error) {
		console.log(`✖ ${description}: ${error.toString().split('\n').shift()}`);
	}
}

console.log('loaded cjs-ext-cjs/index.cjs');

test(
	'has CJS context',
	() => typeof require !== 'undefined' || typeof module !== 'undefined',
);

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
	() => {
		const { stack } = new Error();
		const pathIndex = stack.indexOf(__filename + ':33:');
		const previousCharacter = stack[pathIndex - 1];
		return pathIndex > -1 && previousCharacter !== ':';
	},
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
	'preserves names',
	() => (function functionName() {}).name === 'functionName',
);

module.exports = 1234;
