import { testSuite, expect } from 'manten';
import semver from 'semver';
import type { ExecaReturnValue } from 'execa';
import type { NodeApis } from '../../utils/tsx';
import nodeSupports from '../../utils/node-supports';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load ESM', ({ describe }) => {
		describe('.mjs extension', ({ describe }) => {
			function assertResults(
				{ stdout, stderr }: ExecaReturnValue,
				cjsContext = false,
			) {
				expect(stdout).toMatch('loaded esm-ext-mjs/index.mjs');
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

				test('TypeScript Import', async () => {
					const nodeProcess = await node.import(importPath, { typescript: true });
					assertResults(nodeProcess);
					expect(nodeProcess.stdout).toMatch('{"default":1234}');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);

					// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
					assertResults(nodeProcess, true);
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
					const nodeProcess = await node.import(importPath);
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
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stderr).toMatch('Cannot find module');
				});
			});
		});

		describe('.js extension', ({ describe }) => {
			function assertResults(
				{ stdout, stderr }: ExecaReturnValue,
				cjsContext = false,
			) {
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
				expect(stderr).not.toMatch(/loader/i);
			}

			describe('full path', ({ test }) => {
				const importPath = './lib/esm-ext-js/index.js';

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

			describe('extensionless', ({ test }) => {
				const importPath = './lib/esm-ext-js/index';

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

			describe('directory', ({ test }) => {
				const importPath = './lib/esm-ext-js';

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
});
