import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import outdent from 'outdent';
import type { NodeApis } from '../utils/tsx.js';
import { hasCoverageSourcesContent } from '../utils/coverage-sources-content.js';
import { isWindows } from '../utils/is-windows.js';
import { files, createPackageJson } from '../fixtures.js';
import { packageTypes } from '../utils/package-types.js';

const wasmPath = path.resolve('tests/fixtures/test.wasm');
const wasmPathUrl = pathToFileURL(wasmPath).toString();

export default testSuite(async ({ describe }, { tsx, supports, version }: NodeApis) => {
	describe('Smoke', ({ describe }) => {
		for (const packageType of packageTypes) {
			const isCommonJs = packageType === 'commonjs';

			describe(packageType, ({ test }) => {
				test('from .js', async ({ onTestFail }) => {
					await using fixture = await createFixture({
						'package.json': createPackageJson({ type: packageType }),
						'import-from-js.js': outdent`
						import assert from 'assert';
						import { expectErrors } from 'expect-errors';

						const shouldntAffectFile = \`
						//# sourceMappingURL=\`;
						//# sourceMappingURL=shouldnt affect the file

						// node: prefix
						import 'node:fs';

						import * as pkgCommonjs from 'pkg-commonjs';

						// Named exports from CommonJS
						import { cjsJs } from 'pkg-commonjs/cjs';

						import * as pkgModule from 'pkg-module';
						import 'pkg-module/index';
						import 'pkg-module/empty-export'; // implicit directory & extension

						import 'pkg-exports/file';

						// .js in esm syntax
						import * as js from './js/index.js';
						import './js/index.js?query=123';
						import '@/js/index.js?query=123';
						import './js/index';
						import '@/js/index';
						import './js/';
						import '@/js/';

						// No double .default.default in Dynamic Import
						import/* comment */('./js/index.js').then(m => {
							if (typeof m.default === 'object') {
								assert(
									!('default' in m.default),
									'Should not have double .default.default in Dynamic Import',
								);
							}
						});

						const importWorksInEval = async () => await import ('./js/index.js');
						(0, eval)(importWorksInEval.toString())();

						// .json
						import * as json from './json/index.json';
						import './json/index';
						import '@/json/index';
						import './json/';
						import '@/json/';

						// .cjs
						import * as cjs from './cjs/index.cjs';
						expectErrors(
							[() => import ('./cjs/index'), 'Cannot find module'],
							[() => import ('./cjs/'), 'Cannot find module'],
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
							[() => import ('./mjs/index'), 'Cannot find module'],
							[() => import ('./mjs/'), 'Cannot find module'],
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

						expectErrors(
							// External source maps
							[() => import ('./file-with-sourcemap.js'), 'asdf.js:30:7'],

							// Unsupported files
							[() => import ('./file.txt'), 'Unknown file extension'],
							[() => import (${JSON.stringify(wasmPathUrl)}), 'Unknown file extension'],
							${
								isCommonJs
									? `
									[() => require('./file.txt'), 'hello is not defined'],
									[() => require(${JSON.stringify(wasmPath)}), 'Invalid or unexpected token'],
									`
									: ''
							}
							${
								isCommonJs
									? '[() => require(\'./broken-syntax\'), \'Transform failed\'],'
									: ''
							}
							[() => import ('./broken-syntax'), 'Transform failed'],
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
						`,
						...files,
					});

					const p = await tsx(['import-from-js.js'], fixture.path);
					onTestFail((error) => {
						console.error(error);
						console.log(p);
					});

					expect(p.failed).toBe(false);
					expect(p.stdout).toMatch(`"import.meta.url":"${pathToFileURL(fixture.getPath('import-from-js.js'))}"`);
					expect(p.stdout).toMatch(`"js":{"cjsContext":${isCommonJs},"default":1,"named":2}`);
					expect(p.stdout).toMatch('"json":{"default":{"loaded":"json"},"loaded":"json"}');
					expect(p.stdout).toMatch('"cjs":{"default":{"named":"named"},"named":"named"}');
					expect(p.stdout).toMatch('"pkgModule":{"default":1,"named":2}');
					if (isCommonJs) {
						expect(p.stdout).toMatch('"pkgCommonjs":{"default":1,"named":2}');

						expect(p.stdout).toMatch(/\{"importMetaUrl":"file:\/\/\/.+?\/js\/index\.js","__filename":".+?index\.js"\}/);
						expect(p.stdout).toMatch(/\{"importMetaUrl":"file:\/\/\/.+?\/js\/index\.js\?query=123","__filename":".+?index\.js"\}/);
					} else {
						expect(p.stdout).toMatch(
							supports.cjsInterop
								? '"pkgCommonjs":{"default":{"default":1,"named":2},"named":2}'
								: '"pkgCommonjs":{"default":{"default":1,"named":2}}',
						);

						expect(p.stdout).toMatch(/\{"importMetaUrl":"file:\/\/\/.+?\/js\/index\.js"\}/);
						expect(p.stdout).toMatch(/\{"importMetaUrl":"file:\/\/\/.+?\/js\/index\.js\?query=123"\}/);
					}

					// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
					expect(p.stdout).toMatch(`"mjs":{"mjsHasCjsContext":${isCommonJs}}`);

					expect(p.stderr).toBe('');
				});

				test('from .ts', async ({ onTestFail }) => {
					await using fixture = await createFixture({
						'package.json': createPackageJson({ type: packageType }),

						'import-from-ts.ts': ({ fixturePath }) => outdent`
						import assert from 'assert';
						import { expectErrors } from 'expect-errors';

						const shouldntAffectFile = \`
						//# sourceMappingURL=\`;
						//# sourceMappingURL=shouldnt affect the file

						// node: prefix
						import 'node:fs';

						// Dependencies
						import * as pkgCommonjs from 'pkg-commonjs';
						import * as pkgModule from 'pkg-module';
						import 'pkg-module/index';

						import 'pkg-exports/file';

						// Resolving TS files in dependencies (e.g. implicit extensions & export maps)
						import 'pkg-commonjs/ts.js';
						import 'pkg-module/ts.js';

						// Named exports from CommonJS
						import { cjsJs } from 'pkg-commonjs/cjs';

						// .js in esm syntax
						import * as js from './js/index.js';
						import './js/index.js?query=123';
						import '@/js/index.js?query=123';
						import './js/index';
						import './js/';

						// absolute path
						${
							isWindows
								? ''
								: `import ${JSON.stringify(path.join(fixturePath, 'js/index.js'))};`
						}

						// absolute file url
						import ${JSON.stringify(
							new URL('js/index.js', pathToFileURL(fixturePath)).toString(),
						)};

						// No double .default.default in Dynamic Import
						import/* comment */('./js/index.js').then(m => {
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
							[() => import ('./cjs/index'), 'Cannot find module'],
							[() => import ('./cjs/'), 'Cannot find module'],
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
							[() => import ('./mjs/index'), 'Cannot find module'],
							[() => import ('./mjs/'), 'Cannot find module'],
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
						import '@/ts/index.js';
						import './ts/index.jsx';
						import './ts/index';
						import '@/ts/index';
						import './ts/';
						import '@/ts/';
						import './ts/period.in.name';
						import '@/ts/period.in.name';
						import './ts/dotdot';
						import './ts/dotdot/dotdot';

						// .jsx
						import * as jsx from './jsx/index.jsx';
						import './jsx/index.js';
						import '@/jsx/index.js';
						import './jsx/index';
						import '@/jsx/index';
						import './jsx/';
						import '@/jsx/';

						// .tsx
						import './tsx/index.tsx';
						import './tsx/index.js';
						import './tsx/index.jsx';
						import '@/tsx/index.jsx';
						import './tsx/index';
						import '@/tsx/index';
						import './tsx/';
						import '@/tsx/';

						// .cts
						import './cts/index.cjs';
						import '@/cts/index.cjs';
						expectErrors(
							// TODO:
							// [() => import ('./cts/index.cts'), 'Cannot find module'],
							[() => import ('./cts/index'), 'Cannot find module'],
							[() => import ('./cts/'), 'Cannot find module'],
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
						import '@/mts/index.mjs';
						expectErrors(
							// TODO:
							// [() => import ('./mts/index.mts'), 'Cannot find module'],
							[() => import ('./mts/index'), 'Cannot find module'],
							[() => import ('./mts/'), 'Cannot find module'],
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

						expectErrors(
							// External source maps
							[() => import ('./file-with-sourcemap.js'), 'asdf.js:30:7'],

							// Unsupported files
							[() => import ('./file.txt'), 'Unknown file extension'],
							[() => import (${JSON.stringify(wasmPathUrl)}), 'Unknown file extension'],
							${
								isCommonJs
									? `
									[() => require('./file.txt'), 'hello is not defined'],
									[() => require(${JSON.stringify(wasmPath)}), 'Invalid or unexpected token'],
									`
									: ''
							}
							${
								isCommonJs
									? '[() => require(\'./broken-syntax\'), \'Transform failed\'],'
									: ''
							}
							[() => import ('./broken-syntax'), 'Transform failed'],
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
						`,
						...files,
					});

					const p = await tsx(['import-from-ts.ts'], {
						cwd: fixture.path,
						env: {
							NODE_V8_COVERAGE: 'coverage',
						},
					});

					onTestFail((error) => {
						console.error(error);
						console.log(p);
					});
					expect(p.failed).toBe(false);
					expect(p.stdout).toMatch(`"import.meta.url":"${pathToFileURL(fixture.getPath('import-from-ts.ts'))}"`);
					expect(p.stdout).toMatch(`"js":{"cjsContext":${isCommonJs},"default":1,"named":2}`);
					expect(p.stdout).toMatch('"json":{"default":{"loaded":"json"},"loaded":"json"}');
					expect(p.stdout).toMatch('"cjs":{"default":{"named":"named"},"named":"named"}');
					expect(p.stdout).toMatch(`"jsx":{"cjsContext":${isCommonJs},"jsx":[null,null,["div",null,"JSX"]]}`);
					expect(p.stdout).toMatch('"pkgModule":{"default":1,"named":2}');
					if (isCommonJs) {
						expect(p.stdout).toMatch('"pkgCommonjs":{"default":1,"named":2}');

						expect(p.stdout).toMatch(/\{"importMetaUrl":"file:\/\/\/.+?\/js\/index\.js","__filename":".+?index\.js"\}/);
						expect(p.stdout).toMatch(/\{"importMetaUrl":"file:\/\/\/.+?\/js\/index\.js\?query=123","__filename":".+?index\.js"\}/);
					} else {
						expect(p.stdout).toMatch(
							supports.cjsInterop
								? '"pkgCommonjs":{"default":{"default":1,"named":2},"named":2}'
								: '"pkgCommonjs":{"default":{"default":1,"named":2}}',
						);

						expect(p.stdout).toMatch(/\{"importMetaUrl":"file:\/\/\/.+?\/js\/index\.js"\}/);
						expect(p.stdout).toMatch(/\{"importMetaUrl":"file:\/\/\/.+?\/js\/index\.js\?query=123"\}/);
					}

					// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
					expect(p.stdout).toMatch(`"mjs":{"mjsHasCjsContext":${isCommonJs}}`);
					expect(p.stderr).toBe('');

					const coverageDirectory = fixture.getPath('coverage');
					const coverageSourceMapCache = await hasCoverageSourcesContent(coverageDirectory);
					expect(coverageSourceMapCache).toBe(true);
				});

				test('resolve ts in exports', async () => {
					await using fixture = await createFixture({
						'package.json': createPackageJson({ type: packageType }),
						'index.ts': `
						import A from 'pkg'
						console.log(A satisfies 2)
						`,
						'node_modules/pkg': {
							'package.json': createPackageJson({
								name: 'pkg',
								exports: './test.js',
							}),
							'test.ts': 'export default 1',
						},
					});

					const p = await tsx(['index.ts'], {
						cwd: fixture.path,
					});
					expect(p.failed).toBe(false);
				});

				/**
				 * Node v18 has a bug:
				 * Error [ERR_INTERNAL_ASSERTION]:
				 * 	Code: ERR_MODULE_NOT_FOUND; The provided arguments length (2) does
				 *  not match the required ones (3)
				 */
				if (!version.startsWith('18.')) {
					test('resolve ts in main', async () => {
						await using fixture = await createFixture({
							'package.json': createPackageJson({ type: packageType }),
							'index.ts': `
							import A from 'pkg'
							console.log(A satisfies 2);
							`,
							'node_modules/pkg': {
								'package.json': createPackageJson({
									name: 'pkg',
									main: './test.js',
								}),
								'test.ts': 'export default 1',
							},
						});

						const p = await tsx(['index.ts'], {
							cwd: fixture.path,
						});
						expect(p.failed).toBe(false);
					});
				}
			});
		}
	});
});
