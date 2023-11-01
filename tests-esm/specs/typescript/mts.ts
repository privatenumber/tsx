import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader.js';
import nodeSupports from '../../utils/node-supports.js';
import { assertNotFound } from '../../utils/assertions.js';
import { query } from '../../utils/query.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.mts extension', ({ describe }) => {
		function assertResults(stdout: string) {
			expect(stdout).toMatch('loaded ts-ext-mts/index.mts');
			expect(stdout).toMatch('✖ has CJS context');
			expect(stdout).toMatch('✔ name in error');
			expect(stdout).toMatch('✔ sourcemaps');
			expect(stdout).toMatch('✔ resolves optional node prefix');
			expect(stdout).toMatch('✔ preserves names');
			expect(stdout).toMatch(
				semver.satisfies(node.version, nodeSupports.testRunner)
					? '✔ resolves required node prefix'
					: '✖ resolves required node prefix: Error [ERR_UNKNOWN_BUILTIN_MODULE]',
			);
		}

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-mts/index.mts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Import with query', async () => {
				const nodeProcess = await node.import(importPath + query);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('full path via .mjs', ({ test }) => {
			const importPath = './lib/ts-ext-mts/index.mjs';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				assertNotFound(nodeProcess.stderr, importPath);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath, { typescript: true });
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Import with query', async () => {
				const nodeProcess = await node.import(importPath + query, { typescript: true });
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('extensionless - should not work', ({ test }) => {
			const importPath = './lib/ts-ext-mts/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertNotFound(nodeProcess.stderr, importPath);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertNotFound(nodeProcess.stderr, importPath);
			});

			test('Import with query', async () => {
				const nodeProcess = await node.import(importPath + query);
				assertNotFound(nodeProcess.stderr, importPath);
			});
		});

		describe('directory - should not work', ({ test }) => {
			const importPath = './lib/ts-ext-mts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertNotFound(nodeProcess.stderr, importPath);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertNotFound(nodeProcess.stderr, importPath);
			});

			test('Import with query', async () => {
				const nodeProcess = await node.import(importPath + query);
				assertNotFound(nodeProcess.stderr, importPath);
			});
		});
	});
});
