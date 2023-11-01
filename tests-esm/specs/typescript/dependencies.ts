import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Dependencies', ({ describe }) => {
		describe('TypeScript dependency', ({ test }) => {
			const output = '{"default":"ts default export","namedExport":"ts named export"}';

			test('Import', async ({ onTestFail }) => {
				const nodeProcess = await node.import('package-module/ts.ts');
				onTestFail(() => {
					console.log(nodeProcess);
				});
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import extensionless', async ({ onTestFail }) => {
				const nodeProcess = await node.import('package-module/ts');
				onTestFail(() => {
					console.log(nodeProcess);
				});
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async ({ onTestFail }) => {
				const nodeProcess = await node.import('package-typescript-export');
				onTestFail(() => {
					console.log(nodeProcess);
				});
				expect(nodeProcess.stdout).toBe(output);
			});
		});

		describe('Export map', ({ test }) => {
			const output = '{"default":"default export","namedExport":"named export"}';

			test('Import', async ({ onTestFail }) => {
				const nodeProcess = await node.import('package-exports/index.js', {
					typescript: true,
				});
				onTestFail(() => {
					console.log(nodeProcess);
				});
				expect(nodeProcess.stdout).toBe(output);
			});
		});
	});
});
