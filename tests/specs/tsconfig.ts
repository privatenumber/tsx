import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';
import {
	expectErrors,
	jsxCheck,
	createPackageJson,
	createTsconfig,
} from '../fixtures.js';
import { packageTypes } from '../utils/package-types.js';

export default testSuite(async ({ describe }, { tsx }: NodeApis) => {
	describe('tsconfig', ({ describe }) => {
		for (const packageType of packageTypes) {
			describe(packageType, async ({ describe, onFinish }) => {
				const fixture = await createFixture({
					...expectErrors,

					'package.json': createPackageJson({
						type: packageType,
						dependencies: {
							'custom-condition-package': '*',
						},
					}),

					'tsconfig.json': createTsconfig({
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

					'tsconfig-allowJs.json': createTsconfig({
						extends: './tsconfig.json',
						compilerOptions: {
							allowJs: true,
						},
					}),

					'tsconfig-broken.json': '{ asdf',

					'tsconfig-unresolvable.json': createTsconfig({
						extends: 'doesnt-exist',
					}),

					'tsconfig-customConditions.json': createTsconfig({
						extends: './tsconfig.json',
						compilerOptions: {
							customConditions: ['source'],
						},
					}),

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
					import 'tsconfig-should-not-apply';
					`,

					'file.ts': '',

					'jsx.jsx': `
					// tsconfig not applied to jsx because allowJs is not set
					import { expectErrors } from 'expect-errors';
					expectErrors(
						[() => ${jsxCheck}, 'React is not defined'],

						// These should throw unless allowJs is set
						// [() => import ('prefix/file'), "Cannot find package 'prefix'"],
						// [() => import ('paths-exact-match'), "Cannot find package 'paths-exact-match'"],
						// [() => import ('file'), "Cannot find package 'file'"],
					);
					`,

					'import-typescript-parent.js': `
					import './import-typescript-child.js';
					`,

					'import-typescript-child.ts': `
					console.log('imported');
					`,

					'custom-condition.js': `
          import 'custom-condition-package';
          `,

					'node_modules/tsconfig-should-not-apply': {
						'package.json': createPackageJson({
							exports: {
								import: './index.mjs',
								default: './index.cjs',
							},
						}),
						'index.mjs': `
						import { expectErrors } from 'expect-errors';
						expectErrors(
							[() => import ('prefix/file'), "Cannot find package 'prefix'"],
							[() => import ('paths-exact-match'), "Cannot find package 'paths-exact-match'"],
							[() => import ('file'), "Cannot find package 'file'"],
						);
						`,
						'index.cjs': `
						const { expectErrors } = require('expect-errors');
						expectErrors(
							[() => require('prefix/file'), "Cannot find module"],
							[() => require('paths-exact-match'), "Cannot find module"],
							[() => require('file'), "Cannot find module"],
						);
						`,
					},

					'node_modules/custom-condition-package': {
						'package.json': createPackageJson({
							exports: {
								source: './src/index.js',
								import: './dist/index.js',
							},
						}),
						'src/index.js': `
              console.log('imported from source');
              `,
						'dist/index.js': `
              console.log('imported from dist');
              `,
					},
				});
				onFinish(async () => await fixture.rm());

				describe('detected tsconfig', ({ test }) => {
					test('invalid tsconfig should be ignored', async () => {
						await using fixture = await createFixture({
							'package.json': createPackageJson({ type: packageType }),
							'tsconfig.json': createTsconfig({
								extends: 'doesnt-exist',
							}),
							'index.ts': '',
						});

						const pTsconfig = await tsx(['index.ts'], fixture.path);
						expect(pTsconfig.failed).toBe(false);
					});

					test('tsconfig', async ({ onTestFail }) => {
						const pTsconfig = await tsx(['index.tsx'], fixture.path);
						onTestFail((error) => {
							console.error(error);
							console.log(pTsconfig);
						});
						expect(pTsconfig.failed).toBe(false);
						expect(pTsconfig.stderr).toBe('');
						expect(pTsconfig.stdout).toBe('');
					});
				});

				describe('custom tsconfig', ({ test }) => {
					test('invalid tsconfig should error', async () => {
						await using fixture = await createFixture({
							'package.json': createPackageJson({ type: packageType }),
							'tsconfig.json': createTsconfig({
								extends: 'doesnt-exist',
							}),
							'index.ts': '',
						});

						const pTsconfig = await tsx(['--tsconfig', 'tsconfig.json', 'index.ts'], fixture.path);
						expect(pTsconfig.failed).toBe(true);
					});

					test('custom tsconfig', async ({ onTestFail }) => {
						const pTsconfigAllowJs = await tsx(['--tsconfig', 'tsconfig-allowJs.json', 'jsx.jsx'], fixture.path);
						onTestFail((error) => {
							console.error(error);
							console.log(pTsconfigAllowJs);
						});
						expect(pTsconfigAllowJs.failed).toBe(true);
						expect(pTsconfigAllowJs.stderr).toMatch('Error: No error thrown');
						expect(pTsconfigAllowJs.stdout).toBe('');
					});

					test('allowJs in tsconfig.json', async ({ onTestFail }) => {
						const pTsconfigAllowJs = await tsx(['--tsconfig', 'tsconfig-allowJs.json', 'import-typescript-parent.js'], fixture.path);
						onTestFail((error) => {
							console.error(error);
							console.log(pTsconfigAllowJs);
						});
						expect(pTsconfigAllowJs.failed).toBe(false);
						expect(pTsconfigAllowJs.stderr).toBe('');
						expect(pTsconfigAllowJs.stdout).toBe('imported');
					});

					if (packageType === 'module') {
						test('no customConditions in tsconfig.json for esm', async ({
							onTestFail,
						}) => {
							const pTsconfigCustomConditions = await tsx(
								['custom-condition.js'],
								fixture.path,
							);
							onTestFail((error) => {
								console.error(error);
								console.log(pTsconfigCustomConditions);
							});
							expect(pTsconfigCustomConditions.failed).toBe(false);
							expect(pTsconfigCustomConditions.stderr).toBe('');
							expect(pTsconfigCustomConditions.stdout).toBe('imported from dist');
						});

						test('customConditions in tsconfig.json for esm', async ({
							onTestFail,
						}) => {
							const pTsconfigCustomConditions = await tsx(
								[
									'--tsconfig',
									'tsconfig-customConditions.json',
									'custom-condition.js',
								],
								fixture.path,
							);
							onTestFail((error) => {
								console.error(error);
								console.log(pTsconfigCustomConditions);
							});
							expect(pTsconfigCustomConditions.failed).toBe(false);
							expect(pTsconfigCustomConditions.stderr).toBe('');
							expect(pTsconfigCustomConditions.stdout).toBe(
								'imported from source',
							);
						});
					}
				});
			});
		}
	});
});
