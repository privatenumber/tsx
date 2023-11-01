import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('tsconfig', ({ test, describe }) => {
		test('jsxFactory & jsxFragmentFactory', async () => {
			const nodeProcess = await node.load('./src/tsx.tsx', {
				cwd: './tsconfig',
			});
			expect(nodeProcess.stdout).toBe('div null hello world\nnull null goodbye world');
		});

		describe('scope', ({ test }) => {
			const checkStrictMode = `
			const isStrictMode = (function() { return this; })() === undefined;
			console.log(isStrictMode ? 'strict mode' : 'not strict mode');
			`;
			const checkJsx = 'export default (<div></div>)';

			test('does not apply tsconfig to excluded', async () => {
				const fixture = await createFixture({
					'tsconfig.json': JSON.stringify({
						compilerOptions: {
							strict: true,
							jsxFactory: 'console.log',
						},
						exclude: [
							'excluded',
						],
					}),
					included: {
						'strict-mode-ts.ts': checkStrictMode,
						'strict-mode-js.js': checkStrictMode,
						'jsx.jsx': checkJsx,
						'tsx.tsx': checkJsx,
					},
					excluded: {
						'strict-mode-ts.ts': checkStrictMode,
						'tsx.tsx': checkJsx,
					},
				});

				const includedStrictTs = await node.load('./included/strict-mode-ts.ts', {
					cwd: fixture.path,
				});
				expect(includedStrictTs.stdout).toBe('strict mode');

				const includedStrictJs = await node.load('./included/strict-mode-js.js', {
					cwd: fixture.path,
				});
				expect(includedStrictJs.stdout).toBe('not strict mode');

				const includedJsxTs = await node.load('./included/tsx.tsx', {
					cwd: fixture.path,
				});
				expect(includedJsxTs.stdout).toBe('div null');

				const includedJsxJs = await node.load('./included/jsx.jsx', {
					cwd: fixture.path,
				});
				expect(includedJsxJs.stderr).toMatch('ReferenceError: React is not defined');

				const excludedStrictTs = await node.load('./excluded/strict-mode-ts.ts', {
					cwd: fixture.path,
				});
				expect(excludedStrictTs.stdout).toBe('not strict mode');

				const excludedJsxTs = await node.load('./excluded/tsx.tsx', {
					cwd: fixture.path,
				});
				expect(excludedJsxTs.stderr).toMatch('ReferenceError: React is not defined');

				await fixture.rm();
			});

			test('allowJs', async () => {
				const fixture = await createFixture({
					'tsconfig.json': JSON.stringify({
						compilerOptions: {
							strict: true,
							allowJs: true,
							jsxFactory: 'console.log',
						},
					}),
					src: {
						'strict-mode-js.js': checkStrictMode,
						'jsx.jsx': checkJsx,
					},
				});

				const strictJs = await node.load('./src/strict-mode-js.js', {
					cwd: fixture.path,
				});
				expect(strictJs.stdout).toBe('strict mode');

				const jsxJs = await node.load('./src/jsx.jsx', {
					cwd: fixture.path,
				});
				expect(jsxJs.stdout).toBe('div null');

				await fixture.rm();
			});
		});

		test('Custom tsconfig.json path', async () => {
			const nodeProcess = await node.load('./src/tsx.tsx', {
				cwd: './tsconfig',
				env: {
					ESBK_TSCONFIG_PATH: './tsconfig-custom/tsconfig.custom-name.json',
				},
			});
			expect(nodeProcess.stdout).toBe('');
			expect(nodeProcess.stderr).toBe('div null hello world\nnull null goodbye world');
		});

		describe('paths', ({ test, describe }) => {
			test('resolves baseUrl', async () => {
				const nodeProcess = await node.load('./src/base-url.ts', {
					cwd: './tsconfig',
				});
				expect(nodeProcess.stdout).toBe('resolve-target loaded\nresolve-target value');
			});

			test('Require flag', async () => {
				const nodeProcess = await node.requireFlag('resolve-target', {
					cwd: './tsconfig',
				});
				expect(nodeProcess.stdout).toMatch('resolve-target loaded');
			});

			test('resolves paths exact match', async () => {
				const nodeProcess = await node.load('./src/paths-exact-match.ts', {
					cwd: './tsconfig',
				});
				expect(nodeProcess.stdout).toBe('resolve-target loaded\nresolve-target value');
			});

			test('resolves paths prefix', async () => {
				const nodeProcess = await node.load('./src/paths-prefix-match.ts', {
					cwd: './tsconfig',
				});
				expect(nodeProcess.stdout).toBe('nested-resolve-target');
			});

			test('resolves paths slash prefix', async () => {
				const nodeProcess = await node.load('./src/paths-slash-match.ts', {
					cwd: './tsconfig',
				});
				expect(nodeProcess.stdout).toBe('nested-resolve-target');
			});

			test('resolves paths suffix', async () => {
				const nodeProcess = await node.load('./src/paths-suffix-match.ts', {
					cwd: './tsconfig',
				});
				expect(nodeProcess.stdout).toBe('nested-resolve-target');
			});

			test('resolves paths via .js', async () => {
				const nodeProcess = await node.load('./src/paths-prefix-match-js.ts', {
					cwd: './tsconfig',
				});
				expect(nodeProcess.stdout).toBe('nested-resolve-target');
			});

			describe('dependency', ({ test }) => {
				test('resolve current directory', async () => {
					const nodeProcess = await node.load('./dependency-resolve-current-directory', {
						cwd: './tsconfig',
					});
					expect(nodeProcess.stdout).toBe('resolved');
				});

				test('should not resolve baseUrl', async () => {
					const nodeProcess = await node.load('./dependency-should-not-resolve-baseUrl', {
						cwd: './tsconfig',
					});
					expect(nodeProcess.stdout).toBe('resolved');
				});

				test('should not resolve paths', async () => {
					const nodeProcess = await node.load('./dependency-should-not-resolve-paths', {
						cwd: './tsconfig',
					});
					expect(nodeProcess.stdout).toBe('resolved');
				});
			});
		});
	});
});
