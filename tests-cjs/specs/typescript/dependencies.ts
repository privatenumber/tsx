import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Dependencies', ({ describe }) => {
		describe('export map', ({ test }) => {
			const output = '{"default":"default export","namedExport":"named export"}';

			test('Require', async () => {
				const nodeProcess = await node.require('package-exports/index.js', {
					typescript: true,
				});
				expect(nodeProcess.stdout).toBe(output);
			});
		});
	});
});
