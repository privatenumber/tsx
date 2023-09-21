import { testSuite, expect } from 'manten';
import type { NodeApis } from '../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load WASM', ({ test }) => {
		const importPath = './lib/wasm/index.js';

		test('Unsupported extension error', async () => {
			const nodeProcess = await node.load(importPath);

			expect(nodeProcess.exitCode).toBe(1);

			if (node.isCJS) {
				expect(nodeProcess.stderr).toMatch('Invalid or unexpected token');
			} else {
				expect(nodeProcess.stderr).toMatch('ERR_UNKNOWN_FILE_EXTENSION');
			}
		});

		test('Loads with experimental flag', async () => {
			const nodeProcess = await node.load(importPath, {
				args: ['--experimental-wasm-modules'],
			});

			if (node.isCJS) {
				expect(nodeProcess.exitCode).toBe(1);
				expect(nodeProcess.stderr).toMatch('Invalid or unexpected token');
			} else {
				expect(nodeProcess.exitCode).toBe(0);
				expect(nodeProcess.stdout).toBe('1234');
			}
		});
	});
});
