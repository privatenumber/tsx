import { describe } from 'manten';
import { createNode } from './utils/tsx';
import { nodeVersions } from './utils/node-versions';

(async () => {
	await describe('tsx', async ({ runTestSuite, describe }) => {
		// runTestSuite(import('./specs/cli'));
		// runTestSuite(import('./specs/watch'));

		for (const nodeVersion of nodeVersions) {
			const node = await createNode(nodeVersion);

			await describe(`Node ${node.version}`, ({ runTestSuite }) => {
				runTestSuite(
					import('./specs/smoke'),
					node,
				);
			});
		}
	});
})();
