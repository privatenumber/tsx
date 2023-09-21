import { describe } from 'manten';
import { createFixture } from 'fs-fixture';
import { createNode } from './utils/tsx';

const isWin = process.platform === 'win32';
console.log({
	isWin,
	processPlatform: process.platform,
});

const packageTypes = [
	'commonjs',
	'module',
] as const;

const nodeVersions = [
	'20',
	...(
		(process.env.CI && !isWin)
			? [
				'12.20.0', // CJS named export detection added
				'12',
				'14',
				'16',
				'17',
				'18',
			]
			: []
	),
];

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
