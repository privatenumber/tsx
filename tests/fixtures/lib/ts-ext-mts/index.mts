async function test(description: string, testFunction: () => any | Promise<any>) {
	try {
		const result = await testFunction();
		if (!result) { throw result; }
		console.log(`✔ ${description}`);
	} catch (error) {
		console.log(`✖ ${description}: ${(error as any).toString().split('\n').shift()}`);
	}
}

console.log('loaded ts-ext-mts/index.mts');

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
			// @ts-expect-error - this is a test
			nameInError();
		} catch (error) {
			return (error as any).message.includes('nameInError');
		}
	},
);

test(
	'sourcemaps',
	() => new Error().stack!.includes(':38:'),
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

export default 1234;
