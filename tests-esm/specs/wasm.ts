import { testSuite, expect } from 'manten';
import type { NodeApis } from '../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('WASM', async ({ test }) => {
		const importPath = './lib/wasm/index.js';

		test('Unsupported extension error', async () => {
			const nodeProcess = await node.load(importPath);

			expect(nodeProcess.exitCode).toBe(1);
			expect(nodeProcess.stderr).toMatch('ERR_UNKNOWN_FILE_EXTENSION');
		});

		test('Loads with experimental flag', async () => {
			const nodeProcess = await node.load(importPath, {
				nodeOptions: ['--experimental-wasm-modules'],
			});

			expect(nodeProcess.exitCode).toBe(0);
			expect(nodeProcess.stdout).toBe('1234');
		});
	});
});
