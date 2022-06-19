import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

const output = '{"default":"ts default export","namedExport":"ts named export"}';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('TypeScript dependencies', ({ describe }) => {
		describe('commonjs dependency', ({ test }) => {
			test('Import', async () => {
				const nodeProcess = await node.import('package-commonjs/ts.ts');
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require('package-commonjs/ts.ts');
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('module dependency', ({ test }) => {
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
	});
});
