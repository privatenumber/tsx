import { testSuite } from 'manten';
import type { NodeApis } from '../../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('JavaScript', ({ runTestSuite }) => {
		runTestSuite(import('./cjs.js'), node);
		runTestSuite(import('./esm.js'), node);
		runTestSuite(import('./dependencies.js'), node);
	});
});
