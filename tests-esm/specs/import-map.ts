import { testSuite, expect } from 'manten';
import type { NodeApis } from '../utils/node-with-loader.js';
import { assertError, assertNotFound } from '../utils/assertions.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Import map', ({ describe }) => {
		describe('Directory with star', ({ describe }) => {
			describe('Resolves directory', ({ test }) => {
				const importPath = '#directory-star';

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stdout).toMatch('loaded');
				});

				test('TypeScript Import', async () => {
					const nodeProcess = await node.import(importPath, { typescript: true });
					expect(nodeProcess.stdout).toMatch('loaded');
				});
			});

			describe('Resolves extension', ({ test }) => {
				const importPath = '#directory-star/index';

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stdout).toMatch('loaded');
				});

				test('TypeScript Import', async () => {
					const nodeProcess = await node.import(importPath, { typescript: true });
					expect(nodeProcess.stdout).toMatch('loaded');
				});
			});
		});

		describe('File with star', ({ describe }) => {
			describe('Resolves extension', ({ test }) => {
				const importPath = '#file-star';

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stdout).toMatch('loaded');
				});

				test('TypeScript Import', async () => {
					const nodeProcess = await node.import(importPath, { typescript: true });
					expect(nodeProcess.stdout).toMatch('loaded');
				});
			});
		});

		describe('Errors', ({ test }) => {
			test('Directory', async () => {
				const nodeProcess = await node.import('#directory');
				assertError(
					nodeProcess.stderr,
					'ERR_UNSUPPORTED_DIR_IMPORT',
					'/lib/esm-ext-js',
				);
			});

			test('Non-existent', async () => {
				const nodeProcess = await node.import('#non-existent');
				assertNotFound(nodeProcess.stderr, '/lib/non-existent');
			});
		});
	});
});
