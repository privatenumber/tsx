import { testSuite, expect } from 'manten';
import type { NodeApis } from '../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('data', async ({ test }) => {
		const importPath = './lib/data/index.js';

		test('Loads text/javascript data URLs', async () => {
			const nodeProcess = await node.load(importPath);

			expect(nodeProcess.exitCode).toBe(0);
			expect(nodeProcess.stdout).toMatch('123');
		});
	});
});
