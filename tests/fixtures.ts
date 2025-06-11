import outdent from 'outdent';
import type { PackageJson, TsConfigJson } from 'type-fest';

export const createPackageJson = (packageJson: PackageJson) => JSON.stringify(packageJson);

export const createTsconfig = (tsconfig: TsConfigJson) => JSON.stringify(tsconfig);

const cjsContextCheck = 'typeof module !== \'undefined\'';
const tsCheck = '1 as number';

const declareReact = `
const React = {
	createElement: (...args) => Array.from(args),
};
`;

export const jsxCheck = '<><div>JSX</div></>';

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

export const expectErrors = {
	'node_modules/expect-errors/index.js': `
	exports.expectErrors = async (...assertions) => {
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
				} else if (
					!thrown.message.includes(expectedError)
					&& !thrown.stack.includes(expectedError)
				) {
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
};

export const files = {
	...expectErrors,

	'js/index.js': outdent`
	import assert from 'assert';
	console.log(JSON.stringify({
		importMetaUrl: import.meta.url,
		__filename: typeof __filename !== 'undefined' ? __filename : undefined,
	}));
	${syntaxLowering}
	${preserveName}
	export const cjsContext = ${cjsContextCheck};

	// Implicit directory import works outside of immedaite CWD child
	import '../json/'
	`,

	'json/index.json': JSON.stringify({ 'loaded-file': 'json' }),

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

	// https://github.com/privatenumber/tsx/issues/248
	process.setUncaughtExceptionCaptureCallback(console.error);
	`,

	mjs: {
		'index.mjs': outdent`
		import assert from 'assert';
		import value from './value.mjs';
		export const mjsHasCjsContext = ${cjsContextCheck};

		assert(value === 1, 'wrong default export');

		import ('pkg-commonjs').then((m) => assert(
			!(typeof m.default === 'object' && ('default' in m.default)),
		));
		`,
		'value.mjs': 'export default 1',
	},

	ts: {
		'index.ts': sourcemap.tag`
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

		'period.in.name.ts': 'export { a } from "."',
		dotdot: {
			'index.ts': 'export { a } from ".."',
			'dotdot/index.ts': 'export { a } from "../.."',
		},

		'index.js': 'throw new Error("should not be loaded")',
	},

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

	'tsconfig.json': createTsconfig({
		compilerOptions: {
			paths: {
				'@/*': ['./*'],
			},
		},
	}),

	'file.txt': 'hello',

	'broken-syntax.ts': 'if',

	'file-with-sourcemap.js': outdent`
	throw new Error;
	//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiYXNkZi5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cblxuXG5cbnRocm93IG5ldyBFcnJvcigpIl0sCiAgIm1hcHBpbmdzIjogIkFBNkJBLE1BQU0sSUFBSSIsCiAgIm5hbWVzIjogW10KfQo=
	`,

	node_modules: {
		'pkg-commonjs': {
			'package.json': createPackageJson({
				type: 'commonjs',
				main: './index.js',
			}),
			'index.ts': 'throw new Error("should prefer .js over .ts in node_modules")',
			'index.js': syntaxLowering,
			'ts.ts': syntaxLowering,
			'cjs.js': `
			const _ = exports;
			const cjsJs = true;
			_.cjsJs = cjsJs;

			// Annotate CommonJS exports for Node
			0 && (module.exports = {
				cjsJs,
			});
			`,
		},
		// TODO: Package with no type field but ESM syntax
		// (also check this in the app itself, not just in node_modules)
		'pkg-ambiguous': {
			'package.json': createPackageJson({
				type: 'commonjs',
				main: './index.js',
			}),
			'index.ts': 'throw new Error("should prefer .js over .ts in node_modules")',
			'index.js': syntaxLowering,
			'ts.ts': syntaxLowering,
			'cjs.js': `
			const _ = exports;
			const cjsJs = true;
			_.cjsJs = cjsJs;

			// Annotate CommonJS exports for Node
			0 && (module.exports = {
				cjsJs,
			});
			`,
		},
		'pkg-module': {
			'package.json': createPackageJson({
				type: 'module',
				main: './index.js',
				imports: {
					'#*': './*',
				},
			}),
			'index.ts': 'throw new Error("should prefer .js over .ts in node_modules")',
			'index.js': `${syntaxLowering}\nexport * from "./empty-export"`,
			'empty-export/index.js': 'export {}',
			'ts.ts': `${syntaxLowering}\nexport * from "#empty.js"`,
			'empty.ts': 'export {}',
		},
		'pkg-main': {
			'package.json': createPackageJson({
				main: './index.js',
			}),
			'index.ts': syntaxLowering,
		},
		'pkg-exports': {
			'package.json': createPackageJson({
				exports: {
					'.': './index.js',
					'./file': './file.js',
					'./file.js': './error.js',
					'./file.ts': './error.js',
				},
			}),
			'index.ts': syntaxLowering,
			'file.js': syntaxLowering,
			'error.js': 'throw new Error("should not be loaded")',
		},
	},
};
