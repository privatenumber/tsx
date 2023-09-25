import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../../utils/node-with-loader.js';
import { packageJson, tsconfigJson } from '../../utils/fixtures.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('tsconfig', ({ test, describe }) => {
		test('jsxFactory & jsxFragmentFactory', async () => {
			const nodeProcess = await node.load('./src/tsx.tsx', {
				cwd: './tsconfig',
			});
			expect(nodeProcess.stdout).toBe('div null hello world\nnull null goodbye world');
		});

		describe('scope', ({ test }) => {
			const checkJsx = 'export default (<div></div>)';

			test('does not apply tsconfig to excluded', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'package.json': packageJson({
						type: 'module',
					}),
					'tsconfig.json': tsconfigJson({
						compilerOptions: {
							jsxFactory: 'console.log',
						},
						exclude: [
							'excluded',
						],
					}),
					included: {
						'jsx.jsx': checkJsx,
						'tsx.tsx': checkJsx,
					},
					excluded: {
						'tsx.tsx': checkJsx,
					},
				});

				onTestFinish(async () => await fixture.rm());

				// Strict mode is not tested because ESM is strict by default

				const includedJsxTs = await node.load('./included/tsx.tsx', {
					cwd: fixture.path,
				});
				expect(includedJsxTs.stdout).toBe('div null');

				const includedJsxJs = await node.load('./included/jsx.jsx', {
					cwd: fixture.path,
				});
				expect(includedJsxJs.stderr).toMatch('ReferenceError: React is not defined');

				const excludedJsxTs = await node.load('./excluded/tsx.tsx', {
					cwd: fixture.path,
				});
				expect(excludedJsxTs.stderr).toMatch('ReferenceError: React is not defined');
			});

			test('allowJs', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'package.json': packageJson({
						type: 'module',
					}),
					'tsconfig.json': tsconfigJson({
						compilerOptions: {
							allowJs: true,
							jsxFactory: 'console.log',
						},
					}),
					'src/jsx.jsx': checkJsx,
				});

				onTestFinish(async () => await fixture.rm());

				const jsxJs = await node.load('./src/jsx.jsx', {
					cwd: fixture.path,
				});
				expect(jsxJs.stdout).toBe('div null');
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
			expect(nodeProcess.stderr).toMatch('div null hello world\nnull null goodbye world');
		});

		describe('paths', ({ test, describe }) => {
			test('resolves baseUrl', async () => {
				const nodeProcess = await node.load('./src/base-url.ts', {
					cwd: './tsconfig',
				});
				expect(nodeProcess.stdout).toBe('resolve-target');
			});

			test('resolves paths exact match', async () => {
				const nodeProcess = await node.load('./src/paths-exact-match.ts', {
					cwd: './tsconfig',
				});
				expect(nodeProcess.stdout).toBe('resolve-target');
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
