import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import outdent from 'outdent';
import type { NodeApis } from '../utils/tsx.js';
import { createPackageJson, createTsconfig } from '../fixtures.js';
import { packageTypes } from '../utils/package-types.js';
import { parseJsxPragmas } from '../../src/utils/transform/parse-jsx-pragmas.js';

export default testSuite(async ({ describe }, { tsx }: NodeApis) => {
	describe('JSX Pragmas', ({ describe }) => {
		describe('parseJsxPragmas', ({ test }) => {
			test('parses @jsxImportSource from block comment', () => {
				const code = outdent`
					/** @jsxImportSource solid-js */
					export const App = () => <div>Hello</div>;
				`;
				const pragmas = parseJsxPragmas(code);
				expect(pragmas).toStrictEqual({
					jsxImportSource: 'solid-js',
				});
			});

			test('parses @jsxImportSource from line comment', () => {
				const code = outdent`
					// @jsxImportSource preact
					export const App = () => <div>Hello</div>;
				`;
				const pragmas = parseJsxPragmas(code);
				expect(pragmas).toStrictEqual({
					jsxImportSource: 'preact',
				});
			});

			test('parses @jsx and @jsxFrag', () => {
				const code = outdent`
					/** @jsx h */
					/** @jsxFrag Fragment */
					export const App = () => <div>Hello</div>;
				`;
				const pragmas = parseJsxPragmas(code);
				expect(pragmas).toStrictEqual({
					jsxFactory: 'h',
					jsxFragmentFactory: 'Fragment',
				});
			});

			test('parses all pragmas together', () => {
				const code = outdent`
					/**
					 * @jsxImportSource @emotion/react
					 * @jsx jsx
					 * @jsxFrag Fragment
					 */
					export const App = () => <div>Hello</div>;
				`;
				const pragmas = parseJsxPragmas(code);
				expect(pragmas).toStrictEqual({
					jsxImportSource: '@emotion/react',
					jsxFactory: 'jsx',
					jsxFragmentFactory: 'Fragment',
				});
			});

			test('returns undefined when no pragmas found', () => {
				const code = outdent`
					// Regular comment
					export const App = () => <div>Hello</div>;
				`;
				const pragmas = parseJsxPragmas(code);
				expect(pragmas).toBeUndefined();
			});

			test('handles scoped package names', () => {
				const code = '/** @jsxImportSource @emotion/react */';
				const pragmas = parseJsxPragmas(code);
				expect(pragmas).toStrictEqual({
					jsxImportSource: '@emotion/react',
				});
			});
		});

		for (const packageType of packageTypes) {
			describe(`package type: ${packageType ?? 'undefined'}`, ({ test }) => {
				test('jsxImportSource pragma overrides tsconfig', async ({ onTestFail }) => {
					await using fixture = await createFixture({
						'package.json': createPackageJson({
							...(packageType ? { type: packageType } : {}),
						}),

						// tsconfig sets jsxFactory to Array (classic transform)
						'tsconfig.json': createTsconfig({
							compilerOptions: {
								jsx: 'react',
								jsxFactory: 'Array',
								jsxFragmentFactory: 'null',
							},
						}),

						// File uses pragma to override with custom factory
						'index.tsx': outdent`
							/** @jsx customJsx */
							const customJsx = (...args: unknown[]) => ({ type: 'custom', args });
							const element = <div>test</div>;
							console.log(JSON.stringify(element));
						`,
					});

					const result = await tsx(['index.tsx'], fixture.path);
					onTestFail(() => {
						console.log(result);
					});

					expect(result.failed).toBe(false);
					expect(result.stderr).toBe('');
					// Should use customJsx, not Array
					expect(result.stdout).toMatch('"type":"custom"');
				});

				test('jsxImportSource pragma with automatic runtime', async ({ onTestFail }) => {
					await using fixture = await createFixture({
						'package.json': createPackageJson({
							...(packageType ? { type: packageType } : {}),
						}),

						'tsconfig.json': createTsconfig({
							compilerOptions: {
								jsx: 'react-jsx',
								jsxImportSource: 'react', // default to react
							},
						}),

						// Mock JSX runtime that logs when called
						'node_modules/custom-jsx-runtime/package.json': JSON.stringify({
							name: 'custom-jsx-runtime',
							type: 'module',
							exports: {
								'./jsx-runtime': './jsx-runtime.js',
								'./jsx-dev-runtime': './jsx-runtime.js',
							},
						}),
						'node_modules/custom-jsx-runtime/jsx-runtime.js': outdent`
							export const jsx = (type, props) => ({ source: 'custom-jsx-runtime', type, props });
							export const jsxs = jsx;
							export const Fragment = 'fragment';
						`,

						// File uses pragma to use custom-jsx-runtime instead of react
						'index.tsx': outdent`
							/** @jsxImportSource custom-jsx-runtime */
							const element = <div className="test">hello</div>;
							console.log(JSON.stringify(element));
						`,
					});

					const result = await tsx(['index.tsx'], fixture.path);
					onTestFail(() => {
						console.log(result);
					});

					expect(result.failed).toBe(false);
					expect(result.stderr).toBe('');
					// Should use custom-jsx-runtime
					expect(result.stdout).toMatch('"source":"custom-jsx-runtime"');
				});

				test('different files can use different jsxImportSource', async ({ onTestFail }) => {
					await using fixture = await createFixture({
						'package.json': createPackageJson({
							...(packageType ? { type: packageType } : {}),
						}),

						'tsconfig.json': createTsconfig({
							compilerOptions: {
								jsx: 'react-jsx',
							},
						}),

						// Two mock JSX runtimes
						'node_modules/runtime-a/package.json': JSON.stringify({
							name: 'runtime-a',
							type: 'module',
							exports: {
								'./jsx-runtime': './jsx-runtime.js',
								'./jsx-dev-runtime': './jsx-runtime.js',
							},
						}),
						'node_modules/runtime-a/jsx-runtime.js': outdent`
							export const jsx = (type, props) => ({ runtime: 'A', type, props });
							export const jsxs = jsx;
							export const Fragment = 'fragment';
						`,

						'node_modules/runtime-b/package.json': JSON.stringify({
							name: 'runtime-b',
							type: 'module',
							exports: {
								'./jsx-runtime': './jsx-runtime.js',
								'./jsx-dev-runtime': './jsx-runtime.js',
							},
						}),
						'node_modules/runtime-b/jsx-runtime.js': outdent`
							export const jsx = (type, props) => ({ runtime: 'B', type, props });
							export const jsxs = jsx;
							export const Fragment = 'fragment';
						`,

						'component-a.tsx': outdent`
							/** @jsxImportSource runtime-a */
							export const ComponentA = () => <div>A</div>;
						`,

						'component-b.tsx': outdent`
							/** @jsxImportSource runtime-b */
							export const ComponentB = () => <div>B</div>;
						`,

						'index.tsx': outdent`
							import { ComponentA } from './component-a.js';
							import { ComponentB } from './component-b.js';
							console.log('A:', JSON.stringify(ComponentA()));
							console.log('B:', JSON.stringify(ComponentB()));
						`,
					});

					const result = await tsx(['index.tsx'], fixture.path);
					onTestFail(() => {
						console.log(result);
					});

					expect(result.failed).toBe(false);
					expect(result.stderr).toBe('');
					expect(result.stdout).toMatch('"runtime":"A"');
					expect(result.stdout).toMatch('"runtime":"B"');
				});

				test('jsx pragma works in .jsx files', async ({ onTestFail }) => {
					await using fixture = await createFixture({
						'package.json': createPackageJson({
							...(packageType ? { type: packageType } : {}),
						}),

						'tsconfig.json': createTsconfig({
							compilerOptions: {
								allowJs: true,
								jsx: 'react',
							},
						}),

						'index.jsx': outdent`
							/** @jsx h */
							const h = (...args) => ({ factory: 'h', args });
							const element = <div>test</div>;
							console.log(JSON.stringify(element));
						`,
					});

					const result = await tsx(['index.jsx'], fixture.path);
					onTestFail(() => {
						console.log(result);
					});

					expect(result.failed).toBe(false);
					expect(result.stderr).toBe('');
					expect(result.stdout).toMatch('"factory":"h"');
				});
			});
		}
	});
});
