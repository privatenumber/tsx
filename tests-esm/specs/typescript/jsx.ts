import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { NodeApis } from '../../utils/node-with-loader.js';
import nodeSupports from '../../utils/node-supports.js';
import { assertNotFound } from '../../utils/assertions.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.jsx extension', ({ describe }) => {
		function assertResults(stdout: string) {
			expect(stdout).toMatch('loaded ts-ext-jsx/index.jsx');
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
			const importPath = './lib/ts-ext-jsx/index.jsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		/**
		 * tsc seems to resolve js -> jsx even with allowJs: false
		 */
		describe('full path via .js', ({ test }) => {
			const importPath = './lib/ts-ext-jsx/index.js';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertNotFound(nodeProcess.stderr, importPath);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath, {
					typescript: true,
				});
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-jsx/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-jsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('empty directory should fallback to file', ({ test }) => {
			const importPath = './lib/ts-ext-jsx/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess.stdout);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess.stdout);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('empty but explicit directory should not fallback to file', ({ test }) => {
			const importPath = './lib/ts-ext-jsx/index/';

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertNotFound(nodeProcess.stderr, importPath);
			});
		});
	});
});
