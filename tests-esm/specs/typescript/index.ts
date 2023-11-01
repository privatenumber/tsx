import { testSuite } from 'manten';
import type { NodeApis } from '../../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('TypeScript', async ({ runTestSuite }) => {
		runTestSuite(import('./ts.js'), node);
		runTestSuite(import('./tsx.js'), node);
		runTestSuite(import('./jsx.js'), node);
		runTestSuite(import('./mts.js'), node);
		runTestSuite(import('./cts.js'), node);
		runTestSuite(import('./tsconfig.js'), node);
		runTestSuite(import('./dependencies.js'), node);
	});
});
