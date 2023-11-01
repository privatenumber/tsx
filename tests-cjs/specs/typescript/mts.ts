import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader.js';
import nodeSupports from '../../utils/node-supports.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.mts extension', ({ describe }) => {
		function assertResults(stdout: string) {
			expect(stdout).toMatch('loaded ts-ext-mts/index.mts');
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

		describe('full path', ({ test, describe }) => {
			const importPath = './lib/ts-ext-mts/index.mts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import dynamic', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Unknown file extension');
				} else {
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				}
			});

			describe('Import static', ({ test }) => {
				test('from .js', async () => {
					const nodeProcess = await node.importStatic(importPath);
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('from .ts', async () => {
					const nodeProcess = await node.importStatic(importPath, { extension: 'ts' });
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('from .mts', async () => {
					const nodeProcess = await node.importStatic(importPath, { extension: 'mts' });
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('full path via .mjs', ({ test }) => {
			const importPath = './lib/ts-ext-mts/index.mjs';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Dynamic import', async () => {
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

		describe('extensionless - should not work', ({ test }) => {
			const importPath = './lib/ts-ext-mts/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Dynamic import', async () => {
				const nodeProcess = await node.importDynamic(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});
		});

		describe('directory - should not work', ({ test }) => {
			const importPath = './lib/ts-ext-mts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Dynamic import', async () => {
				const nodeProcess = await node.importDynamic(importPath);

				if (semver.satisfies(node.version, nodeSupports.import)) {
					expect(nodeProcess.stderr).toMatch('Directory import');
				} else {
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				}
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});
		});
	});
});
