import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('tsconfig', ({ test }) => {
		test('jsxFactory & jsxFragmentFactory', async () => {
			const nodeProcess = await node.load('./tsx.tsx', {
				cwd: './tsconfig',
			});
			expect(nodeProcess.stdout).toBe('div null hello world\nnull null goodbye world');
		});
	});
});
