import path from 'path';
import { pathToFileURL } from 'url';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import outdent from 'outdent';
import type { NodeApis } from '../utils/tsx.js';

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

const wasmPath = path.resolve('tests/fixtures/test.wasm');
const wasmPathUrl = pathToFileURL(wasmPath).toString();

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
	) => `import('fs');\nconst { stack } = new Error(); const searchString = 'index.${extension}:SOURCEMAP_LINE'; assert(stack.includes(searchString), \`Expected \${searchString} in stack: \${stack}\`)`,
	tag: (
		strings: TemplateStringsArray,
		...values: string[]
	) => {
		const finalString = String.raw({ raw: strings }, ...values);
		const lineNumber = finalString.split('\n').findIndex(line => line.includes('SOURCEMAP_LINE')) + 1;
		return finalString.replaceAll('SOURCEMAP_LINE', lineNumber.toString());
	},
};

const files = {
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
	exports.named = 'named';
	`,

	'mjs/index.mjs': `
	export const mjsHasCjsContext = ${cjsContextCheck};
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
					return new Error(\`Message \${JSON.stringify(expectedError)} not found in \${JSON.stringify(thrown.message)}\`);
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
				exports: './index.js',
			}),
			'index.js': `${syntaxLowering}\nexport * from "./empty-export.js"`,
			'empty-export.js': 'export {}',
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
			// [() => import('prefix/file'), "Cannot find package 'prefix'"],
			// [() => import('paths-exact-match'), "Cannot find package 'paths-exact-match'"],
			// [() => import('file'), "Cannot find package 'file'"],
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
				[() => import('prefix/file'), "Cannot find package 'prefix'"],
				[() => import('paths-exact-match'), "Cannot find package 'paths-exact-match'"],
				[() => import('file'), "Cannot find package 'file'"],
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

const packageTypes = [
	'module',
	'commonjs',
] as const;

export default testSuite(async ({ describe }, { tsx }: NodeApis) => {
	describe('Smoke', ({ describe }) => {
		for (const packageType of packageTypes) {
			const isCommonJs = packageType === 'commonjs';

			describe(packageType, ({ test, describe }) => {
				test('from .js', async ({ onTestFinish, onTestFail }) => {
					const fixture = await createFixture({
						...files,
						'package.json': JSON.stringify({ type: packageType }),
						'import-from-js.js': outdent`
						import assert from 'assert';
						import { expectErrors } from './expect-errors';

						const shouldntAffectFile = \`
						//# sourceMappingURL=\`;
						//# sourceMappingURL=shouldnt affect the file

						// node: prefix
						import 'node:fs';

						import * as pkgCommonjs from 'pkg-commonjs';
						import * as pkgModule from 'pkg-module';

						// .js
						import * as js from './js/index.js';
						import './js/index.js?query=123';
						import './js/index';
						import './js/';

						// No double .default.default in Dynamic Import
						import('./js/index.js').then(m => {
							if (typeof m.default === 'object') {
								assert(
									!('default' in m.default),
									'Should not have double .default.default in Dynamic Import',
								);
							}
						});

						const importWorksInEval = async () => await import('./js/index.js');
						(0, eval)(importWorksInEval.toString())();

						// .json
						import * as json from './json/index.json';
						import './json/index';
						import './json/';

						// .cjs
						import * as cjs from './cjs/index.cjs';
						expectErrors(
							[() => import('./cjs/index'), 'Cannot find module'],
							[() => import('./cjs/'), 'Cannot find module'],
							${
								isCommonJs
									? `
									[() => require('./cjs/index'), 'Cannot find module'],
									[() => require('./cjs/'), 'Cannot find module'],
									`
									: ''
							}
						);

						// .mjs
						import * as mjs from './mjs/index.mjs';
						expectErrors(
							[() => import('./mjs/index'), 'Cannot find module'],
							[() => import('./mjs/'), 'Cannot find module'],
							${
								isCommonJs
									? `
									[() => require('./mjs/index'), 'Cannot find module'],
									[() => require('./mjs/'), 'Cannot find module'],
									`
									: ''
							}
						);

						// Is TS loadable here?
						// Import jsx?

						// Unsupported files
						expectErrors(
							[() => import('./file.txt'), 'Unknown file extension'],
							[() => import(${JSON.stringify(wasmPathUrl)}), 'Unknown file extension'],
							${
								isCommonJs
									? `
									[() => require('./file.txt'), 'hello is not defined'],
									[() => require(${JSON.stringify(wasmPath)}), 'Invalid or unexpected token'],
									`
									: ''
							}
						);

						console.log(JSON.stringify({
							'import.meta.url': import.meta.url,
							js,
							json,
							cjs,
							mjs,
							pkgCommonjs,
							pkgModule,
						}));
		
						// Could .js import TS files?

						// Comment at EOF: could be a sourcemap declaration. Edge case for inserting functions here
						`.trim(),
					});
					onTestFinish(async () => await fixture.rm());

					const p = await tsx(['import-from-js.js'], fixture.path);
					onTestFail((error) => {
						console.error(error);
						console.log(p);
					});
					expect(p.failed).toBe(false);
					expect(p.stdout).toMatch(`"import.meta.url":"${pathToFileURL(path.join(fixture.path, 'import-from-js.js'))}"`);
					expect(p.stdout).toMatch(`"js":{"cjsContext":${isCommonJs},"default":1,"named":2}`);
					expect(p.stdout).toMatch('"json":{"default":{"loaded":"json"},"loaded":"json"}');
					expect(p.stdout).toMatch('"cjs":{"default":{"named":"named"},"named":"named"}');
					expect(p.stdout).toMatch('"pkgModule":{"default":1,"named":2}');
					if (isCommonJs) {
						expect(p.stdout).toMatch('"pkgCommonjs":{"default":1,"named":2}');
					} else {
						expect(p.stdout).toMatch('"pkgCommonjs":{"default":{"default":1,"named":2}}');
					}

					// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
					expect(p.stdout).toMatch(`"mjs":{"mjsHasCjsContext":${isCommonJs}}`);

					expect(p.stderr).toBe('');
				});

				describe('from .ts', async ({ test, onFinish }) => {
					const fixture = await createFixture({
						...files,
						'package.json': JSON.stringify({ type: packageType }),

						'import-from-ts.ts': outdent`
						import assert from 'assert';
						import { expectErrors } from './expect-errors';

						const shouldntAffectFile = \`
						//# sourceMappingURL=\`;
						//# sourceMappingURL=shouldnt affect the file

						// node: prefix
						import 'node:fs';

						// Dependencies
						import * as pkgCommonjs from 'pkg-commonjs';
						import * as pkgModule from 'pkg-module';

						// TODO: Test resolving TS files in dependencies (e.g. implicit extensions & export maps)

						// .js
						import * as js from './js/index.js';
						import './js/index.js?query=123';
						import './js/index';
						import './js/';

						// No double .default.default in Dynamic Import
						import('./js/index.js').then(m => {
							if (typeof m.default === 'object') {
								assert(
									!('default' in m.default),
									'Should not have double .default.default in Dynamic Import',
								);
							}
						});

						// .json
						import * as json from './json/index.json';
						import './json/index';
						import './json/';

						// .cjs
						import * as cjs from './cjs/index.cjs';
						expectErrors(
							[() => import('./cjs/index'), 'Cannot find module'],
							[() => import('./cjs/'), 'Cannot find module'],
							${
								isCommonJs
									? `
									[() => require('./cjs/index'), 'Cannot find module'],
									[() => require('./cjs/'), 'Cannot find module'],
									`
									: ''
							}
						);

						// .mjs
						import * as mjs from './mjs/index.mjs';
						expectErrors(
							[() => import('./mjs/index'), 'Cannot find module'],
							[() => import('./mjs/'), 'Cannot find module'],
							${
								isCommonJs
									? `
									[() => require('./mjs/index'), 'Cannot find module'],
									[() => require('./mjs/'), 'Cannot find module'],
									`
									: ''
							}
						);
		
						// .ts
						import './ts/index.ts';
						import './ts/index.js';
						import './ts/index.jsx';
						import './ts/index';
						import './ts/';
		
						// .jsx
						import * as jsx from './jsx/index.jsx';
						import './jsx/index.js';
						import './jsx/index';
						import './jsx/';

						// .tsx
						import './tsx/index.tsx';
						import './tsx/index.js';
						import './tsx/index.jsx';
						import './tsx/index';
						import './tsx/';

						// .cts
						import './cts/index.cjs';
						expectErrors(
							// TODO:
							// [() => import('./cts/index.cts'), 'Cannot find module'],
							[() => import('./cts/index'), 'Cannot find module'],
							[() => import('./cts/'), 'Cannot find module'],
							${
								isCommonJs
									? `
									[() => require('./cts/index'), 'Cannot find module'],
									[() => require('./cts/'), 'Cannot find module'],
									`
									: ''
							}
						);
						// Loading via Node arg should not work via .cjs but with .cts

						// .mts
						import './mts/index.mjs';
						expectErrors(
							// TODO:
							// [() => import('./mts/index.mts'), 'Cannot find module'],
							[() => import('./mts/index'), 'Cannot find module'],
							[() => import('./mts/'), 'Cannot find module'],
							${
								isCommonJs
									? `
									[() => require('./mts/index'), 'Cannot find module'],
									[() => require('./mts/'), 'Cannot find module'],
									`
									: ''
							}
						);
						// Loading via Node arg should not work via .mjs but with .mts

						// Unsupported files
						expectErrors(
							[() => import('./file.txt'), 'Unknown file extension'],
							[() => import(${JSON.stringify(wasmPathUrl)}), 'Unknown file extension'],
							${
								isCommonJs
									? `
									[() => require('./file.txt'), 'hello is not defined'],
									[() => require(${JSON.stringify(wasmPath)}), 'Invalid or unexpected token'],
									`
									: ''
							}
						);

						console.log(JSON.stringify({
							'import.meta.url': import.meta.url,
							js,
							json,
							jsx,
							cjs,
							mjs,
							pkgCommonjs,
							pkgModule,
						}));

						// Comment at EOF: could be a sourcemap declaration. Edge case for inserting functions here
						`.trim(),
					});
					onFinish(async () => await fixture.rm());

					test('import all', async ({ onTestFail }) => {
						const p = await tsx(['import-from-ts.ts'], fixture.path);
						onTestFail((error) => {
							console.error(error);
							console.log(p);
						});
						expect(p.failed).toBe(false);
						expect(p.stdout).toMatch(`"import.meta.url":"${pathToFileURL(path.join(fixture.path, 'import-from-ts.ts'))}"`);
						expect(p.stdout).toMatch(`"js":{"cjsContext":${isCommonJs},"default":1,"named":2}`);
						expect(p.stdout).toMatch('"json":{"default":{"loaded":"json"},"loaded":"json"}');
						expect(p.stdout).toMatch('"cjs":{"default":{"named":"named"},"named":"named"}');
						expect(p.stdout).toMatch(`"jsx":{"cjsContext":${isCommonJs},"jsx":[null,null,["div",null,"JSX"]]}`);
						expect(p.stdout).toMatch('"pkgModule":{"default":1,"named":2}');
						if (isCommonJs) {
							expect(p.stdout).toMatch('"pkgCommonjs":{"default":1,"named":2}');
						} else {
							expect(p.stdout).toMatch('"pkgCommonjs":{"default":{"default":1,"named":2}}');
						}

						// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
						expect(p.stdout).toMatch(`"mjs":{"mjsHasCjsContext":${isCommonJs}}`);
						expect(p.stderr).toBe('');
					});

					test('tsconfig', async ({ onTestFail }) => {
						const pTsconfig = await tsx(['index.tsx'], path.join(fixture.path, 'tsconfig'));
						onTestFail((error) => {
							console.error(error);
							console.log(pTsconfig);
						});
						expect(pTsconfig.failed).toBe(false);
						expect(pTsconfig.stderr).toBe('');
						expect(pTsconfig.stdout).toBe('');
					});

					test('custom tsconfig', async ({ onTestFail }) => {
						const pTsconfigAllowJs = await tsx(['--tsconfig', 'tsconfig-allowJs.json', 'jsx.jsx'], path.join(fixture.path, 'tsconfig'));
						onTestFail((error) => {
							console.error(error);
							console.log(pTsconfigAllowJs);
						});
						expect(pTsconfigAllowJs.failed).toBe(true);
						expect(pTsconfigAllowJs.stderr).toMatch('Error: No error thrown');
						expect(pTsconfigAllowJs.stdout).toBe('');
					});

					test('allowJs in tsconfig.json', async ({ onTestFail }) => {
						const pTsconfigAllowJs = await tsx(['--tsconfig', 'tsconfig/tsconfig-allowJs.json', 'import-typescript-parent.js'], fixture.path);
						onTestFail((error) => {
							console.error(error);
							console.log(pTsconfigAllowJs);
						});
						expect(pTsconfigAllowJs.failed).toBe(false);
						expect(pTsconfigAllowJs.stderr).toBe('');
						expect(pTsconfigAllowJs.stdout).toBe('imported');
					});
				});
			});
		}
	});
});
