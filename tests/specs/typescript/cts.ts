import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { ExecaReturnValue } from 'execa';
import type { NodeApis } from '../../utils/tsx';
import nodeSupports from '../../utils/node-supports';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.cts extension', ({ describe }) => {
		function assertResults({ stdout, stderr }: ExecaReturnValue) {
			expect(stdout).toMatch('loaded ts-ext-cts/index.cts');
			expect(stdout).toMatch('✔ has CJS context');
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
			const importPath = './lib/ts-ext-cts/index.cts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				assertResults(nodeProcess);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('full path via .cjs', ({ test }) => {
			const importPath = './lib/ts-ext-cts/index.cjs';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath, { typescript: true });
				assertResults(nodeProcess);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath, { typescript: true });
				assertResults(nodeProcess);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('extensionless - should not work', ({ test }) => {
			const importPath = './lib/ts-ext-cts/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});
		});

		describe('directory - should not work', ({ test }) => {
			const importPath = './lib/ts-ext-cts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});
		});
	});
});
