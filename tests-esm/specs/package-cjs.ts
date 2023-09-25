import { testSuite, expect } from 'manten';
import type { NodeApis } from '../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Package CJS', async ({ test }) => {
		test('Loading JS should use CJS loader and succeed', async ({ onTestFail }) => {
			const nodeProcess = await node.load('./commonjs.js');
			onTestFail(() => {
				console.log(nodeProcess);
			});
			expect(nodeProcess.exitCode).toBe(0);
			expect(nodeProcess.stdout).toBe('string');
		});

		test('Loading TS should use CJS loader and fail', async () => {
			const nodeProcess = await node.load('./typescript.ts');
			expect(nodeProcess.exitCode).toBe(1);
			expect(nodeProcess.stderr).toMatch('internal/modules/cjs/loader');
			expect(nodeProcess.stderr).toMatch('SyntaxError: Unexpected token \':\'');
		});
	});
});
