import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader.js';
import nodeSupports from '../../utils/node-supports.js';
import { assertNotFound } from '../../utils/assertions.js';
import { query } from '../../utils/query.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load ESM', ({ describe }) => {
		describe('.mjs extension', ({ describe }) => {
			function assertResults({ stdout, stderr }: { stdout: string; stderr: string }) {
				expect(stdout).toMatch('loaded esm-ext-mjs/index.mjs');
				expect(stdout).toMatch('✖ has CJS context: false');
				expect(stdout).toMatch('✔ name in error');
				expect(stdout).toMatch('✔ sourcemaps');
				expect(stdout).toMatch('✔ resolves optional node prefix');
				expect(stdout).toMatch('✔ preserves names');
				expect(stdout).toMatch(
					semver.satisfies(node.version, nodeSupports.testRunner)
						? '✔ resolves required node prefix'
						: '✖ resolves required node prefix: Error [ERR_UNKNOWN_BUILTIN_MODULE]',
				);
				expect(stderr).not.toMatch('Obsolete loader hook');
			}

			describe('full path', ({ test }) => {
				const importPath = './lib/esm-ext-mjs/index.mjs';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertResults(nodeProcess);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('Import with query', async () => {
					const nodeProcess = await node.import(importPath + query);
					assertResults(nodeProcess);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('TypeScript Import', async () => {
					const nodeProcess = await node.import(importPath, { typescript: true });
					assertResults(nodeProcess);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			describe('extensionless - should not work', ({ test }) => {
				const importPath = './lib/esm-ext-mjs/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertNotFound(nodeProcess.stderr, importPath);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertNotFound(nodeProcess.stderr, importPath);
				});
			});

			describe('directory - should not work', ({ test }) => {
				const importPath = './lib/esm-ext-mjs';

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

		describe('.js extension', ({ describe }) => {
			function assertResults({ stdout, stderr }: { stdout: string; stderr: string }) {
				expect(stdout).toMatch('loaded esm-ext-js/index.js');
				expect(stdout).toMatch('✖ has CJS context: false');
				expect(stdout).toMatch('✔ name in error');
				expect(stdout).toMatch('✔ sourcemaps');
				expect(stdout).toMatch('✔ resolves optional node prefix');
				expect(stdout).toMatch('✔ preserves names');
				expect(stdout).toMatch(
					semver.satisfies(node.version, nodeSupports.testRunner)
						? '✔ resolves required node prefix'
						: '✖ resolves required node prefix: Error [ERR_UNKNOWN_BUILTIN_MODULE]',
				);
				expect(stderr).not.toMatch('Obsolete loader hook');
			}

			describe('full path', ({ test }) => {
				const importPath = './lib/esm-ext-js/index.js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertResults(nodeProcess);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('Import with query', async () => {
					const nodeProcess = await node.import(importPath + query);
					assertResults(nodeProcess);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			describe('extensionless', ({ test }) => {
				const importPath = './lib/esm-ext-js/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertResults(nodeProcess);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			describe('directory', ({ test }) => {
				const importPath = './lib/esm-ext-js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertResults(nodeProcess);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			describe('empty directory should fallback to file', ({ test }) => {
				const importPath = './lib/esm-ext-js/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					assertResults(nodeProcess);
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertResults(nodeProcess);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});
			});

			describe('empty but explicit directory should not fallback to file', ({ test }) => {
				const importPath = './lib/esm-ext-js/index/';

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					assertNotFound(nodeProcess.stderr, importPath);
				});
			});
		});
	});
});
