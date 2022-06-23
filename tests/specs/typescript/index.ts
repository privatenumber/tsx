import { testSuite } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('TypeScript', async ({ runTestSuite }) => {
		runTestSuite(import('./ts'), node);
		runTestSuite(import('./tsx'), node);
		runTestSuite(import('./jsx'), node);
		runTestSuite(import('./mts'), node);
		runTestSuite(import('./cts'), node);
		runTestSuite(import('./tsconfig'), node);
		runTestSuite(import('./dependencies'), node);
	});
});
