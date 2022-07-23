import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Dependencies', ({ describe }) => {
		describe('TypeScript dependency', ({ test }) => {
			const output = '{"default":"ts default export","namedExport":"ts named export"}';

			test('Import', async () => {
				const nodeProcess = await node.import('package-module/ts.ts');
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Import extensionless', async () => {
				const nodeProcess = await node.import('package-module/ts');
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Import', async () => {
				const nodeProcess = await node.import('package-typescript-export');
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('Export map', ({ test }) => {
			const output = '{"default":"default export","namedExport":"named export"}';

			test('Import', async () => {
				const nodeProcess = await node.import('package-exports/index.js', {
					typescript: true,
				});
				expect(nodeProcess.stdout).toBe(output);
			});
		});
	});
});
