import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { ExecaReturnValue } from 'execa';
import type { NodeApis } from '../../utils/tsx';
import nodeSupports from '../../utils/node-supports';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.jsx extension', ({ describe }) => {
		function assertResults(
			{ stdout, stderr }: ExecaReturnValue,
			cjsContext = false,
		) {
			expect(stdout).toMatch('loaded ts-ext-jsx/index.jsx');
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
			expect(stderr).not.toMatch(/loader/i);
		}

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-jsx/index.jsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess, node.isCJS);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess, node.isCJS);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				assertResults(nodeProcess, true);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-jsx/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess, node.isCJS);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess, node.isCJS);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				assertResults(nodeProcess, true);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-jsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess, node.isCJS);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess, node.isCJS);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				assertResults(nodeProcess, true);
				expect(nodeProcess.stdout).toMatch('{"default":["div",null,"hello world"]}');
			});
		});
	});
});
