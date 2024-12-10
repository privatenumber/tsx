import { describe } from 'manten';
import { createNode } from './utils/tsx';
import { nodeVersions } from './utils/node-versions';

(async () => {
	await describe('tsx', async ({ runTestSuite, describe }) => {
		await runTestSuite(import('./specs/repl'));
		await runTestSuite(import('./specs/transform-esbuild'));

		for (const nodeVersion of nodeVersions) {
			const node = await createNode(nodeVersion);
			await describe(`Node ${node.version}`, async ({ runTestSuite }) => {
				await runTestSuite(import('./specs/smoke'), node);
				await runTestSuite(import('./specs/api'), node);
				await runTestSuite(import('./specs/cli'), node);
				await runTestSuite(import('./specs/watch'), node);
				await runTestSuite(import('./specs/loaders'), node);
				await runTestSuite(import('./specs/tsconfig'), node);
			});
		}
	});
})();
