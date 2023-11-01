import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader.js';
import nodeSupports from '../../utils/node-supports.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.ts extension', ({ describe }) => {
		function assertResults(stdout: string, loadedMessage = 'loaded ts-ext-ts/index.ts\n') {
			expect(stdout).toMatch(loadedMessage);
			expect(stdout).toMatch('✔ has CJS context');
			expect(stdout).toMatch('✔ import.meta.url');
			expect(stdout).toMatch('✔ name in error');
			expect(stdout).toMatch('✔ sourcemaps');
			expect(stdout).toMatch('✔ has dynamic import');
			expect(stdout).toMatch('✔ resolves optional node prefix');
			expect(stdout).toMatch('✔ preserves names');
			expect(stdout).toMatch(
				semver.satisfies(node.version, nodeSupports.testRunner)
					? '✔ resolves required node prefix'
					: '✖ resolves required node prefix: Error',
			);
		}

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index.ts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			if (semver.satisfies(node.version, nodeSupports.sourceMap)) {
				test('Disables native source map if Error.prepareStackTrace is customized', async () => {
					const nodeProcess = await node.load(importPath, {
						nodeOptions: ['-r', 'source-map-support/register'],
					});
					assertResults(nodeProcess.stdout);
				});
			}

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Unknown file extension');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Require flag', async () => {
				const nodeProcess = await node.requireFlag(importPath);
				assertResults(nodeProcess.stdout);
			});
		});

		describe('full path via .js', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index.js';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath, { mode: 'typescript' });

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath, { typescript: true });
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('extensionless with subextension', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index.tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout, 'loaded ts-ext-ts/index.tsx.ts\n');
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				} else {
					assertResults(nodeProcess.stdout, 'loaded ts-ext-ts/index.tsx.ts\n');
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				assertResults(nodeProcess.stdout, 'loaded ts-ext-ts/index.tsx.ts\n');
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-ts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Directory import');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});
	});
});
