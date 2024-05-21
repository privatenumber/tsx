import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';
import { expectErrors, jsxCheck } from '../fixtures.js';
import { packageTypes } from '../utils/package-types.js';

export default testSuite(async ({ describe }, { tsx }: NodeApis) => {
	describe('tsconfig', ({ describe }) => {
		for (const packageType of packageTypes) {
			describe(packageType, async ({ test, onFinish }) => {
				const fixture = await createFixture({
					...expectErrors,

					'package.json': JSON.stringify({ type: packageType }),

					'import-typescript-parent.js': `
					import './import-typescript-child.js';
					`,

					'import-typescript-child.ts': `
					console.log('imported');
					`,

					tsconfig: {
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

						'file.ts': '',
						'tsconfig-allowJs.json': JSON.stringify({
							extends: './tsconfig.json',
							compilerOptions: {
								allowJs: true,
							},
						}),

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

					},
				});
				onFinish(async () => await fixture.rm());

				test('tsconfig', async ({ onTestFail }) => {
					const pTsconfig = await tsx(['index.tsx'], fixture.getPath('tsconfig'));
					onTestFail((error) => {
						console.error(error);
						console.log(pTsconfig);
					});
					expect(pTsconfig.failed).toBe(false);
					expect(pTsconfig.stderr).toBe('');
					expect(pTsconfig.stdout).toBe('');
				});

				test('custom tsconfig', async ({ onTestFail }) => {
					const pTsconfigAllowJs = await tsx(['--tsconfig', 'tsconfig-allowJs.json', 'jsx.jsx'], fixture.getPath('tsconfig'));
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
		}
	});
});
