import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Dependencies', ({ describe }) => {
		describe('module dependency', ({ test }) => {
			const output = '{"default":"default export","namedExport":"named export"}';

			test('Import', async ({ onTestFail }) => {
				const nodeProcess = await node.import('package-module');
				onTestFail(() => {
					console.log(nodeProcess);
				});
				expect(nodeProcess.stdout).toBe(output);
			});
		});
	});
});
