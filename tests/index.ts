import { describe } from 'manten';
import { createNode } from './utils/tsx';
import { nodeVersions } from './utils/node-versions';

(async () => {
	await describe('tsx', async ({ runTestSuite, describe }) => {
		await runTestSuite(import('./specs/cli'));
		await runTestSuite(import('./specs/watch'));
		await runTestSuite(import('./specs/repl'));
		await runTestSuite(import('./specs/source-map'));

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
