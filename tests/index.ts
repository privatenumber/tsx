import { describe } from 'manten';
import { createFixture } from 'fs-fixture';
import { createNode } from './utils/tsx';
import { nodeVersions } from './utils/node-versions';

const packageTypes = [
	'commonjs',
	'module',
] as const;

(async () => {
	for (const packageType of packageTypes) {
		await describe(`Package type: ${packageType}`, async ({ describe, onFinish }) => {
			const fixture = await createFixture('./tests/fixtures/');

			onFinish(async () => await fixture.rm());

			await fixture.writeJson('package.json', {
				type: packageType,
			});

			await describe('tsx', ({ runTestSuite }) => {
				runTestSuite(
					import('./specs/cli'),
					fixture.path,
				);
				runTestSuite(
					import('./specs/watch'),
					fixture.path,
				);
			});

			for (const nodeVersion of nodeVersions) {
				const node = await createNode(nodeVersion, fixture.path);

				node.packageType = packageType;

				await describe(`Node ${node.version}`, ({ runTestSuite }) => {
					runTestSuite(
						import('./specs/repl'),
						node,
					);
					runTestSuite(
						import('./specs/javascript'),
						node,
					);
					runTestSuite(
						import('./specs/typescript'),
						node,
					);
					runTestSuite(
						import('./specs/json'),
						node,
					);
					runTestSuite(
						import('./specs/wasm'),
						node,
					);
				});
			}
		});
	}
})();
