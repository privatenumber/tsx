const cjsContextCheck = 'typeof module !== \'undefined\'';
const tsCheck = '1 as number';

const declareReact = `
const React = {
	createElement: (...args) => Array.from(args),
};
`;
const jsxCheck = '<><div>JSX</div></>';

const preserveName = `
assert(
	(function functionName() {}).name === 'functionName',
	'Name should be preserved'
);
`;

const syntaxLowering = `
// es2016 - Exponentiation operator
10 ** 4;

// es2017 - Async functions
(async () => {});

// es2018 - Spread properties
({...Object});

// es2018 - Rest properties
const {...x} = Object;

// es2019 - Optional catch binding
try {} catch {}

// es2020 - Optional chaining
Object?.keys;

// es2020 - Nullish coalescing
Object ?? true

// es2020 - import.meta
// import.meta

// es2021 - Logical assignment operators
// let a = false; a ??= true; a ||= true; a &&= true;

// es2022 - Class instance fields
(class { x });

// es2022 - Static class fields
(class { static x });

// es2022 - Private instance methods
(class { #x() {} });

// es2022 - Private instance fields
(class { #x });

// es2022 - Private static methods
(class { static #x() {} });

// es2022 - Private static fields
(class { static #x });

// es2022 - Class static blocks
(class { static {} });

export const named = 2;
export default 1;
`;

const sourcemap = {
	// Adding the dynamic import helps test the import transformation's source map
	test: (
		extension: string,
	) => `import ('node:fs');\nconst { stack } = new Error(); const searchString = 'index.${extension}:SOURCEMAP_LINE'; assert(stack.includes(searchString), \`Expected \${searchString} in stack: \${stack}\`)`,
	tag: (
		strings: TemplateStringsArray,
		...values: string[]
	) => {
		const finalString = String.raw({ raw: strings }, ...values);
		const lineNumber = finalString.split('\n').findIndex(line => line.includes('SOURCEMAP_LINE')) + 1;
		return finalString.replaceAll('SOURCEMAP_LINE', lineNumber.toString());
	},
};

export const files = {
	'js/index.js': `
	import assert from 'assert';
	${syntaxLowering}
	${preserveName}
	export const cjsContext = ${cjsContextCheck};
	`,

	'json/index.json': JSON.stringify({ loaded: 'json' }),

	'cjs/index.cjs': sourcemap.tag`
	const assert = require('node:assert');
	assert(${cjsContextCheck}, 'Should have CJS context');
	${preserveName}
	${sourcemap.test('cjs')}

	// Assert __esModule is unwrapped
	import ('../ts/index.ts').then((m) => assert(
		!(typeof m.default === 'object' && ('default' in m.default)),
	));
	exports.named = 'named';
	`,

	'mjs/index.mjs': `
	import assert from 'assert';
	export const mjsHasCjsContext = ${cjsContextCheck};

	import ('pkg-commonjs').then((m) => assert(
		!(typeof m.default === 'object' && ('default' in m.default)),
	));
	`,

	'ts/index.ts': sourcemap.tag`
	import assert from 'assert';
	import type {Type} from 'resolved-by-tsc'

	interface Foo {}

	type Foo = number

	declare module 'foo' {}

	enum BasicEnum {
		Left,
		Right,
	}

	enum NamedEnum {
		SomeEnum = 'some-value',
	}

	export const a = BasicEnum.Left;

	export const b = NamedEnum.SomeEnum;

	export default function foo(): string {
		return 'foo'
	}

	// For "ts as tsx" test
	const bar = <T>(value: T) => fn<T>();

	${preserveName}
	${sourcemap.test('ts')}
	export const cjsContext = ${cjsContextCheck};
	${tsCheck};
	`,

	// TODO: test resolution priority for files 'index.tsx` & 'index.tsx.ts` via 'index.tsx'

	'jsx/index.jsx': sourcemap.tag`
	import assert from 'assert';
	export const cjsContext = ${cjsContextCheck};
	${declareReact}
	export const jsx = ${jsxCheck};
	${preserveName}
	${sourcemap.test('jsx')}
	`,

	'tsx/index.tsx': sourcemap.tag`
	import assert from 'assert';
	export const cjsContext = ${cjsContextCheck};
	${tsCheck};
	${declareReact}
	export const jsx = ${jsxCheck};
	${preserveName}
	${sourcemap.test('tsx')}
	`,

	'mts/index.mts': sourcemap.tag`
	import assert from 'assert';
	export const mjsHasCjsContext = ${cjsContextCheck};
	${tsCheck};
	${preserveName}
	${sourcemap.test('mts')}
	`,

	'cts/index.cts': sourcemap.tag`
	const assert = require('assert');
	assert(${cjsContextCheck}, 'Should have CJS context');
	${tsCheck};
	${preserveName}
	${sourcemap.test('cts')}
	`,

	'expect-errors.js': `
	export const expectErrors = async (...assertions) => {
		let errors = await Promise.all(
			assertions.map(async ([fn, expectedError]) => {
				let thrown;
				try {
					await fn();
				} catch (error) {
					thrown = error;
				}

				if (!thrown) {
					return new Error('No error thrown');
				} else if (!thrown.message.includes(expectedError)) {
					return new Error(\`Message \${JSON.stringify(expectedError)} not found in \${JSON.stringify(thrown.message)}\n\${thrown.stack}\`);
				}
			}),
		);

		errors = errors.filter(Boolean);

		if (errors.length > 0) {
			console.error(errors);
			process.exitCode = 1;
		}
	};
	`,

	'file.txt': 'hello',

	'import-typescript-parent.js': sourcemap.tag`
	import './import-typescript-child.js';
	`,

	'import-typescript-child.ts': sourcemap.tag`
	console.log('imported');
	`,

	'broken-syntax.ts': 'if',

	node_modules: {
		'pkg-commonjs': {
			'package.json': JSON.stringify({
				type: 'commonjs',
			}),
			'index.js': syntaxLowering,
		},
		'pkg-module': {
			'package.json': JSON.stringify({
				type: 'module',
				main: './index.js',
			}),
			'index.js': `${syntaxLowering}\nexport * from "./empty-export"`,
			'empty-export/index.js': 'export {}',
		},
	},

	tsconfig: {
		'file.ts': '',

		'jsx.jsx': `
		// tsconfig not applied to jsx because allowJs is not set
		import { expectErrors } from '../expect-errors';
		expectErrors(
			[() => ${jsxCheck}, 'React is not defined'],

			// These should throw unless allowJs is set
			// [() => import ('prefix/file'), "Cannot find package 'prefix'"],
			// [() => import ('paths-exact-match'), "Cannot find package 'paths-exact-match'"],
			// [() => import ('file'), "Cannot find package 'file'"],
		);
		`,

		'node_modules/tsconfig-should-not-apply': {
			'package.json': JSON.stringify({
				exports: {
					import: './index.mjs',
					default: './index.cjs',
				},
			}),
			'index.mjs': `
			import { expectErrors } from '../../../expect-errors';
			expectErrors(
				[() => import ('prefix/file'), "Cannot find package 'prefix'"],
				[() => import ('paths-exact-match'), "Cannot find package 'paths-exact-match'"],
				[() => import ('file'), "Cannot find package 'file'"],
			);
			`,
			'index.cjs': `
			const { expectErrors } = require('../../../expect-errors');
			expectErrors(
				[() => require('prefix/file'), "Cannot find module"],
				[() => require('paths-exact-match'), "Cannot find module"],
				[() => require('file'), "Cannot find module"],
			);
			`,
		},

		'index.tsx': `
		${jsxCheck};

		import './jsx';

		// Resolves relative to baseUrl
		import 'file';

		// Resolves paths - exact match
		import 'paths-exact-match';

		// Resolves paths - prefix match
		import 'prefix/file';

		// Resolves paths - suffix match
		import 'file/suffix';

		// tsconfig should not apply to dependency
		import "tsconfig-should-not-apply";
		`,

		'tsconfig.json': JSON.stringify({
			compilerOptions: {
				jsxFactory: 'Array',
				jsxFragmentFactory: 'null',
				baseUrl: '.',
				paths: {
					'paths-exact-match': ['file'],
					'prefix/*': ['*'],
					'*/suffix': ['*'],
				},
			},
		}),

		'tsconfig-allowJs.json': JSON.stringify({
			extends: './tsconfig.json',
			compilerOptions: {
				allowJs: true,
			},
		}),
	},
};
