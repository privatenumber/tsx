import { describe } from 'manten';
import { createNode } from './utils/tsx';
import { nodeVersions } from './utils/node-versions';

(async () => {
	await describe('tsx', async ({ runTestSuite, describe }) => {
		await runTestSuite(import('./specs/watch'));
		await runTestSuite(import('./specs/repl'));
		await runTestSuite(import('./specs/transform'));

		for (const nodeVersion of nodeVersions) {
			await describe(`Node ${nodeVersion}`, async ({ runTestSuite }) => {
				const node = await createNode(nodeVersion);

				await runTestSuite(import('./specs/cli'), node);

				await runTestSuite(
					import('./specs/smoke'),
					node,
				);
			});
		}
	});
})();
