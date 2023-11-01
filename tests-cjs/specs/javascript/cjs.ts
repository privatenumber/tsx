import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader.js';
import nodeSupports from '../../utils/node-supports.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load CJS', ({ describe }) => {
		describe('.cjs extension', ({ describe }) => {
			function assertResults(stdout: string) {
				expect(stdout).toMatch('loaded cjs-ext-cjs/index.cjs');
				expect(stdout).toMatch('✔ has CJS context');
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
				const importPath = './lib/cjs-ext-cjs/index.cjs';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout);
				});

				test('Import', async () => {
					const nodeProcess = await node.importDynamic(importPath);
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('TypeScript Import', async () => {
					const nodeProcess = await node.importDynamic(importPath, { mode: 'typescript' });
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('1234');
				});
			});

			describe('extensionless - shoud not work', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs/index';

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

			describe('directory - shoud not work', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs';

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
			function assertResults(stdout: string) {
				expect(stdout).toMatch('loaded cjs-ext-js/index.js');
				expect(stdout).toMatch('✔ has CJS context');
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
				const importPath = './lib/cjs-ext-js/index.js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout);
				});

				test('Import', async () => {
					const nodeProcess = await node.importDynamic(importPath);
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('1234');
				});
			});

			describe('extensionless', ({ test }) => {
				const importPath = './lib/cjs-ext-js/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout);
				});

				/**
				 * Dynamic import was introduced in Node v12.20+ and v13.2+
				 * https://github.com/evanw/esbuild/blob/783527408b41bf55a6ac7ebb0b1ab4128a29417d/scripts/compat-table.js#L233
				 *
				 * For Node.js versions that support import, the esm-loader
				 * should be used.
				 *
				 * Alternatively, we can set the target to Node 11
				 * and transform the import to a require(). But
				 * this means other features will be transpiled.
				 */
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
					expect(nodeProcess.stdout).toMatch('1234');
				});
			});

			describe('directory', ({ test }) => {
				const importPath = './lib/cjs-ext-js';

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
					expect(nodeProcess.stdout).toMatch('1234');
				});
			});
		});
	});
});
