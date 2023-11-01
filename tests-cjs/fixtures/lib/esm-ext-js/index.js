async function test(description, testFunction) {
	try {
		const result = await testFunction();
		if (!result) { throw result; }
		console.log(`✔ ${description}`);
	} catch (error) {
		console.log(`✖ ${description}: ${error.toString().split('\n').shift()}`);
	}
}

console.log('loaded esm-ext-js/index.js');

test(
	'has CJS context',
	() => typeof require !== 'undefined' || typeof module !== 'undefined',
);

test(
	'import.meta.url',
	() => Boolean(import.meta.url),
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
		return (
			stack.includes(`${__filename}:38:`)
			|| stack.includes(`${__filename.toLowerCase()}:38:`)
		);
	},
);

test(
	'has dynamic import',
	() => import('fs').then(Boolean),
);

test(
	'resolves optional node prefix',
	() => import('node:fs').then(Boolean),
);

test(
	'resolves required node prefix',
	() => import('node:test').then(Boolean),
);

test(
	'preserves names',
	() => (function functionName() {}).name === 'functionName',
);

export default 1234;
