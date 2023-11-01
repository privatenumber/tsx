import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader.js';
import nodeSupports from '../../utils/node-supports.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	const nodeSupportsEsm = semver.satisfies(node.version, nodeSupports.esm);

	describe('Load ESM', ({ describe }) => {
		describe('.mjs extension', ({ describe }) => {
			function assertResults(stdout: string, cjsContext: boolean) {
				expect(stdout).toMatch('loaded esm-ext-mjs/index.mjs');
				expect(stdout).toMatch(
					cjsContext
						? '✔ has CJS context'
						: '✖ has CJS context',
				);
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
				const importPath = './lib/esm-ext-mjs/index.mjs';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout, !nodeSupportsEsm);
				});

				test('Import', async () => {
					const nodeProcess = await node.importDynamic(importPath);
					assertResults(nodeProcess.stdout, !nodeSupportsEsm);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('TypeScript Import', async () => {
					const nodeProcess = await node.importDynamic(importPath, { mode: 'typescript' });
					assertResults(nodeProcess.stdout, !nodeSupportsEsm);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					assertResults(nodeProcess.stdout, true);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			describe('extensionless - should not work', ({ test }) => {
				const importPath = './lib/esm-ext-mjs/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});

				test('Import', async () => {
					const nodeProcess = await node.importDynamic(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});
			});

			describe('directory - should not work', ({ test }) => {
				const importPath = './lib/esm-ext-mjs';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});

				test('Import', async () => {
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

		describe('.js extension', ({ describe }) => {
			function assertResults(stdout: string, cjsContext: boolean) {
				expect(stdout).toMatch('loaded esm-ext-js/index.js');
				expect(stdout).toMatch(
					cjsContext
						? '✔ has CJS context'
						: '✖ has CJS context',
				);
				expect(stdout).toMatch('✔ name in error');
				expect(stdout).toMatch('✔ sourcemaps');
				expect(stdout).toMatch('✔ has dynamic import');
				expect(stdout).toMatch('✔ resolves optional node prefix');
				expect(stdout).toMatch(
					semver.satisfies(node.version, nodeSupports.testRunner)
						? '✔ resolves required node prefix'
						: '✖ resolves required node prefix: Error',
				);
			}

			describe('full path', ({ test }) => {
				const importPath = './lib/esm-ext-js/index.js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout, true);
				});

				test('Import', async () => {
					const nodeProcess = await node.importDynamic(importPath);
					assertResults(nodeProcess.stdout, true);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('CommonJS Import', async () => {
					const nodeProcess = await node.importDynamic(importPath, { mode: 'commonjs' });
					assertResults(nodeProcess.stdout, true);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					assertResults(nodeProcess.stdout, true);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			describe('extensionless', ({ test }) => {
				const importPath = './lib/esm-ext-js/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout, true);
				});

				test('Import', async () => {
					const nodeProcess = await node.importDynamic(importPath);

					if (semver.satisfies(node.version, nodeSupports.import)) {
						expect(nodeProcess.stderr).toMatch('Cannot find module');
					} else {
						assertResults(nodeProcess.stdout, true);
						expect(nodeProcess.stdout).toMatch('{"default":1234}');
					}
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					assertResults(nodeProcess.stdout, true);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			describe('directory', ({ test }) => {
				const importPath = './lib/esm-ext-js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout, true);
				});

				test('Import', async () => {
					const nodeProcess = await node.importDynamic(importPath);

					if (semver.satisfies(node.version, nodeSupports.import)) {
						expect(nodeProcess.stderr).toMatch('Directory import');
					} else {
						assertResults(nodeProcess.stdout, true);
						expect(nodeProcess.stdout).toMatch('{"default":1234}');
					}
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					assertResults(nodeProcess.stdout, true);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});
		});
	});
});
