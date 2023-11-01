import { describe } from 'manten';
import { createNode } from './utils/node-with-loader.js';

const nodeVersions = [
	'20',
	...(
		(
			process.env.CI
			&& process.platform !== 'win32'
		)
			? [
				'18',
			]
			: []
	),
];

(async () => {
	for (const nodeVersion of nodeVersions) {
		const node = await createNode(nodeVersion, './tests-cjs/fixtures');

		await describe(`Node ${node.version}`, ({ runTestSuite }) => {
			runTestSuite(
				import('./specs/javascript/index.js'),
				node,
			);
			runTestSuite(
				import('./specs/typescript/index.js'),
				node,
			);
			runTestSuite(
				import('./specs/negative-tests.js'),
				node,
			);
		});
	}
})();
