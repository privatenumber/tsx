import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Dependencies', ({ describe }) => {
		describe('commonjs dependency', ({ test }) => {
			const output = '{"default":"default export","namedExport":"named export"}';

			test('Import', async () => {
				const nodeProcess = await node.import('package-commonjs');
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require('package-commonjs');
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('module dependency', ({ test }) => {
			const output = '{"default":"default export","namedExport":"named export"}';

			test('Import', async () => {
				const nodeProcess = await node.import('package-module');
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});
		});
	});
});
