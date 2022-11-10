import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { ExecaReturnValue } from 'execa';
import type { NodeApis } from '../../utils/tsx';
import nodeSupports from '../../utils/node-supports';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.ts extension', ({ describe }) => {
		function assertResults(
			{ stdout, stderr }: ExecaReturnValue,
			cjsContext = false,
			loadedMessage = 'loaded ts-ext-ts/index.ts',
		) {
			expect(stdout).toMatch(loadedMessage);
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
			const importPath = './lib/ts-ext-ts/index.ts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess, node.isCJS);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess, node.isCJS);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				assertResults(nodeProcess, true);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Require flag', async () => {
				const nodeProcess = await node.requireFlag(importPath);
				assertResults(nodeProcess, true);
			});
		});

		describe('full path via .js', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index.js';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath, { typescript: true });
				assertResults(nodeProcess, node.isCJS);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath, { typescript: true });

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				assertResults(nodeProcess, true);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess, node.isCJS);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess, node.isCJS);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				assertResults(nodeProcess, true);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('extensionless with subextension', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index.tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess, node.isCJS, 'loaded ts-ext-ts/index.tsx.ts');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess, node.isCJS, 'loaded ts-ext-ts/index.tsx.ts');
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				assertResults(nodeProcess, true, 'loaded ts-ext-ts/index.tsx.ts');
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-ts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				assertResults(nodeProcess, node.isCJS);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				assertResults(nodeProcess, node.isCJS);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				assertResults(nodeProcess, true);
				expect(nodeProcess.stdout).toMatch('{"default":1234}');
			});
		});
	});
});
