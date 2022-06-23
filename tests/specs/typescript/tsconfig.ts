import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('tsconfig', ({ test, describe }) => {
		// test('jsxFactory & jsxFragmentFactory', async () => {
		// 	const nodeProcess = await node.load('./src/tsx.tsx', {
		// 		cwd: './tsconfig',
		// 	});
		// 	expect(nodeProcess.stdout).toBe('div null hello world\nnull null goodbye world');
		// });

		describe('paths', ({ test, describe }) => {
			// test('resolves baseUrl', async () => {
			// 	const nodeProcess = await node.load('./src/base-url.ts', {
			// 		cwd: './tsconfig',
			// 	});
			// 	expect(nodeProcess.stdout).toBe('resolve-target');
			// });

			// test('resolves paths exact match', async () => {
			// 	const nodeProcess = await node.load('./src/paths-exact-match.ts', {
			// 		cwd: './tsconfig',
			// 	});
			// 	expect(nodeProcess.stdout).toBe('resolve-target');
			// });

			// test('resolves paths prefix', async () => {
			// 	const nodeProcess = await node.load('./src/paths-prefix-match.ts', {
			// 		cwd: './tsconfig',
			// 	});
			// 	expect(nodeProcess.stdout).toBe('nested-resolve-target');
			// });

			// test('resolves paths suffix', async () => {
			// 	const nodeProcess = await node.load('./src/paths-suffix-match.ts', {
			// 		cwd: './tsconfig',
			// 	});
			// 	expect(nodeProcess.stdout).toBe('nested-resolve-target');
			// });

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
