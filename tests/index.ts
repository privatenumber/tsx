import { describe } from 'manten';
import { createNode } from './utils/tsx';
import { createFixture } from './utils/create-fixture';

const isWin = process.platform === 'win32';

const packageTypes = [
	'commonjs',
	'module',
] as const;

const nodeVersions = [
	'12.20.0', // CJS named export detection added
	'12.22.11',
	...(
		(process.env.CI && !isWin)
			? [
				'14.19.1',
				'16.13.2',
				'17.8.0',
				'18.1.0',
			]
			: []
	),
];

(async () => {
	for (const packageType of packageTypes) {
		await describe(`Package type: ${packageType}`, async ({ describe }) => {
			const fixture = await createFixture('./tests/fixtures/');

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
						import('./specs/binary'),
						node,
					);
				});
			}

			await fixture.cleanup();
		});
	}
})();
