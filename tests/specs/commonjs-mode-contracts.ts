import {
	describe, test, onTestFail, expect,
} from 'manten';
import { createFixture } from 'fs-fixture';
import { outdent } from 'outdent';
import type { NodeApis } from '../utils/tsx.js';
import {
	createPackageJson,
	createTsconfig,
} from '../fixtures.js';

const commonJsModes = [
	{
		label: 'omitted type',
		packageJson: {},
	},
	{
		label: 'explicit commonjs',
		packageJson: { type: 'commonjs' as const },
	},
] as const;

export const commonJsModeContracts = (node: NodeApis) => describe('CommonJS mode contracts', () => {
	test('omitted type and explicit commonjs share the same package main/exports resolution behavior', async () => {
		for (const { label, packageJson } of commonJsModes) {
			await using fixture = await createFixture({
				'package.json': createPackageJson(packageJson),
				'index.js': `
					import exportsValue from 'pkg-exports';
					import mainValue from 'pkg-main';

					console.log(JSON.stringify({
						exportsValue,
						mainValue,
					}));
					`,
				node_modules: {
					'pkg-exports': {
						'package.json': createPackageJson({
							name: 'pkg-exports',
							exports: './test.ts',
						}),
						'test.ts': 'export default "exports";',
					},
					'pkg-main': {
						'package.json': createPackageJson({
							name: 'pkg-main',
							main: './test.ts',
						}),
						'test.ts': 'export default "main";',
					},
				},
			});

			const result = await node.tsx(['index.js'], fixture.path);
			onTestFail(() => {
				console.log(label, result);
			});

			expect({
				failed: result.failed,
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
			}).toEqual({
				failed: false,
				exitCode: 0,
				stdout: '{"exportsValue":"exports","mainValue":"main"}',
				stderr: '',
			});
		}
	});

	test('omitted type and explicit commonjs share the same detected tsconfig behavior', async () => {
		for (const { label, packageJson } of commonJsModes) {
			await using fixture = await createFixture({
				'package.json': createPackageJson(packageJson),
				'tsconfig.json': createTsconfig({
					compilerOptions: {
						baseUrl: '.',
						paths: {
							alias: ['./file.ts'],
						},
					},
				}),
				'index.ts': `
					import { value } from 'alias';

					console.log(value);
					`,
				'file.ts': 'export const value = "resolved";',
			});

			const result = await node.tsx(['index.ts'], fixture.path);
			onTestFail(() => {
				console.log(label, result);
			});

			expect({
				failed: result.failed,
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
			}).toEqual({
				failed: false,
				exitCode: 0,
				stdout: 'resolved',
				stderr: '',
			});
		}
	});

	test('omitted type and explicit commonjs share the same explicit allowJs behavior', async () => {
		for (const { label, packageJson } of commonJsModes) {
			await using fixture = await createFixture({
				'package.json': createPackageJson(packageJson),
				'tsconfig-allowJs.json': createTsconfig({
					compilerOptions: {
						allowJs: true,
					},
				}),
				'import-typescript-parent.js': `
					import './import-typescript-child.js';
					`,
				'import-typescript-child.ts': `
					console.log('imported');
					`,
			});

			const result = await node.tsx(
				['--tsconfig', 'tsconfig-allowJs.json', 'import-typescript-parent.js'],
				fixture.path,
			);
			onTestFail(() => {
				console.log(label, result);
			});

			expect({
				failed: result.failed,
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
			}).toEqual({
				failed: false,
				exitCode: 0,
				stdout: 'imported',
				stderr: '',
			});
		}
	});

	// Regression guard for two closed bugs that lacked paired tests:
	// - https://github.com/privatenumber/tsx/issues/694 -- Node 23.6+ classified
	//   .ts entrypoints as ESM in CJS-shaped packages, breaking __dirname and
	//   __filename ("not defined in ES module scope").
	// - https://github.com/privatenumber/tsx/issues/726 -- v4.20 returned undefined
	//   for require.cache; reverted in v4.20.3 without a paired test.
	test('CJS-classified .ts entrypoint exposes __dirname, __filename, and require.cache', async () => {
		for (const { label, packageJson } of commonJsModes) {
			await using fixture = await createFixture({
				'package.json': createPackageJson(packageJson),
				'index.ts': outdent`
					require('./dep.cjs');
					console.log(JSON.stringify({
						dirname: __dirname,
						filename: __filename,
						requireCacheType: typeof require.cache,
						requireCacheHasKeys: Object.keys(require.cache).length > 0,
					}));
				`,
				'dep.cjs': 'module.exports = { loaded: true };',
			});

			const result = await node.tsx(['index.ts'], fixture.path);
			onTestFail(() => {
				console.log(label, result);
			});

			expect({
				failed: result.failed,
				exitCode: result.exitCode,
				stderr: result.stderr,
			}).toEqual({
				failed: false,
				exitCode: 0,
				stderr: '',
			});
			expect(JSON.parse(result.stdout)).toEqual({
				dirname: fixture.path,
				filename: fixture.getPath('index.ts'),
				requireCacheType: 'object',
				requireCacheHasKeys: true,
			});
		}
	});

	// tsx is intentionally more lenient than Node for ambiguous-`type` and
	// explicit `"commonjs"` packages: a `.js`/`.ts` file that mixes ESM
	// `import`/`export` syntax with explicit `require()` calls still runs,
	// because tsx classifies the file as CJS and esbuild rewrites the ESM
	// imports while leaving `require` intact. Plain Node would refuse the
	// same file with `ReferenceError: require is not defined in ES module
	// scope`. Any "match Node's syntax detection" refactor of the classifier
	// must keep these passing or be split behind a feature flag.
	describe('lenient ESM in CommonJS-classified files', () => {
		// Hybrid `import` + bare `require()` in a TypeScript file. The naive
		// failure mode is detection promoting the file to "module", which
		// drops `require` from scope.
		test('hybrid import and require() in .ts runs', async () => {
			for (const { label, packageJson } of commonJsModes) {
				await using fixture = await createFixture({
					'package.json': createPackageJson(packageJson),
					'entry.ts': `
						import { posix } from 'node:path';

						const config = require('./config.json');

						console.log(JSON.stringify({
							joined: posix.join('/', 'foo'),
							config,
						}));
						`,
					'config.json': JSON.stringify({ loaded: true }),
				});

				const result = await node.tsx(['entry.ts'], fixture.path);
				onTestFail(() => {
					console.log(label, result);
				});

				expect({
					failed: result.failed,
					exitCode: result.exitCode,
					stdout: result.stdout,
					stderr: result.stderr,
				}).toEqual({
					failed: false,
					exitCode: 0,
					stdout: '{"joined":"/foo","config":{"loaded":true}}',
					stderr: '',
				});
			}
		});

		// TypeScript `import x = require()` interop combined with additional
		// bare `require()` calls. Detection promotion would break the bare
		// `require()` even when the `import =` form is preserved.
		test('TypeScript import = require() interop with bare require() runs', async () => {
			for (const { label, packageJson } of commonJsModes) {
				await using fixture = await createFixture({
					'package.json': createPackageJson(packageJson),
					'entry.ts': `
						import path = require('node:path');

						const config = require('./config.json');

						console.log(JSON.stringify({
							joined: path.posix.join('/', 'foo'),
							config,
						}));
						`,
					'config.json': JSON.stringify({ loaded: true }),
				});

				const result = await node.tsx(['entry.ts'], fixture.path);
				onTestFail(() => {
					console.log(label, result);
				});

				expect({
					failed: result.failed,
					exitCode: result.exitCode,
					stdout: result.stdout,
					stderr: result.stderr,
				}).toEqual({
					failed: false,
					exitCode: 0,
					stdout: '{"joined":"/foo","config":{"loaded":true}}',
					stderr: '',
				});
			}
		});

		// Same hybrid shape, but in a `.js` file with no TypeScript syntax.
		// Detection refactors that key off ESM tokens in plain JS regress
		// here too -- the `.js` extension is not a hint either way without
		// a `"type"` field.
		test('hybrid import and require() in .js runs', async () => {
			for (const { label, packageJson } of commonJsModes) {
				await using fixture = await createFixture({
					'package.json': createPackageJson(packageJson),
					'entry.js': `
						import { posix } from 'node:path';

						const config = require('./config.json');

						console.log(JSON.stringify({
							joined: posix.join('/', 'foo'),
							config,
						}));
						`,
					'config.json': JSON.stringify({ loaded: true }),
				});

				const result = await node.tsx(['entry.js'], fixture.path);
				onTestFail(() => {
					console.log(label, result);
				});

				expect({
					failed: result.failed,
					exitCode: result.exitCode,
					stdout: result.stdout,
					stderr: result.stderr,
				}).toEqual({
					failed: false,
					exitCode: 0,
					stdout: '{"joined":"/foo","config":{"loaded":true}}',
					stderr: '',
				});
			}
		});

		// `export` paired with bare `require()` against a sibling `.cjs`
		// module. Symmetric coverage with the `import` cases above and
		// pins the export-side of the lenient contract.
		test('export with bare require() of a .cjs sibling runs', async () => {
			for (const { label, packageJson } of commonJsModes) {
				await using fixture = await createFixture({
					'package.json': createPackageJson(packageJson),
					'entry.ts': `
						const local = require('./util.cjs');

						export const result = local.value;

						console.log('result:', result);
						`,
					'util.cjs': 'module.exports.value = "from-cjs";',
				});

				const result = await node.tsx(['entry.ts'], fixture.path);
				onTestFail(() => {
					console.log(label, result);
				});

				expect({
					failed: result.failed,
					exitCode: result.exitCode,
					stdout: result.stdout,
					stderr: result.stderr,
				}).toEqual({
					failed: false,
					exitCode: 0,
					stdout: 'result: from-cjs',
					stderr: '',
				});
			}
		});
	});
});
