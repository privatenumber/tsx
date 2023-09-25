import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader.js';
import nodeSupports from '../../utils/node-supports.js';
import { assertNotFound } from '../../utils/assertions.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load CJS', ({ describe }) => {
		describe('.cjs extension', ({ describe }) => {
			describe('full path', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs/index.cjs';

				function assertResults(stdout: string) {
					expect(stdout).toMatch('loaded cjs-ext-cjs/index.cjs');
					expect(stdout).toMatch('✔ has CJS context');
					expect(stdout).toMatch('✔ name in error');
					expect(stdout).toMatch('✔ sourcemaps');
					expect(stdout).toMatch('✔ has dynamic import');
					expect(stdout).toMatch('✔ preserves names');
					expect(stdout).toMatch(
						semver.satisfies(node.version, nodeSupports.nodePrefixRequire)
							? '✔ resolves optional node prefix'
							: '✖ resolves optional node prefix: Error:',
					);
					expect(stdout).toMatch(
						semver.satisfies(node.version, nodeSupports.testRunner)
							? '✔ resolves required node prefix'
							: '✖ resolves required node prefix: Error',
					);
				}

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('TypeScript Import', async () => {
					const nodeProcess = await node.import(importPath, { typescript: true });
					assertResults(nodeProcess.stdout);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			describe('extensionless - should not resolve', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertNotFound(nodeProcess.stderr, importPath);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertNotFound(nodeProcess.stderr, importPath);
				});
			});

			describe('directory - should not resolve', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertNotFound(nodeProcess.stderr, importPath);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertNotFound(nodeProcess.stderr, importPath);
				});
			});
		});

		/**
		 * This will not work via require() because the CommonJS loader
		 * will validate package.json#type to see if it's `commonjs`.
		 *
		 * Can be worked around by adding the require hook to overwrite:
		 * https://github.com/nodejs/node/blob/442e84a358d75152556b5d087e4dd6a51615330d/lib/internal/modules/cjs/loader.js#L1125
		 */
		describe('.js extension - should not run in CJS context given package.json#type:module', ({ describe }) => {
			function assertResults(stdout: string) {
				expect(stdout).toMatch('loaded cjs-ext-js/index.js');
				expect(stdout).toMatch('✖ has CJS context: false');
				expect(stdout).toMatch('✔ name in error');
				expect(stdout).toMatch('✔ sourcemaps');
				expect(stdout).toMatch('✔ has dynamic import');
				expect(stdout).toMatch('✔ preserves names');
			}

			describe('full path', ({ test }) => {
				const importPath = './lib/cjs-ext-js/index.js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertResults(nodeProcess.stdout);
				});
			});

			describe('extensionless', ({ test }) => {
				const importPath = './lib/cjs-ext-js/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertResults(nodeProcess.stdout);
				});
			});

			describe('directory', ({ test }) => {
				const importPath = './lib/cjs-ext-js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess.stdout);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertResults(nodeProcess.stdout);
				});
			});
		});
	});
});
