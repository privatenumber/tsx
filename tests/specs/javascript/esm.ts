import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load ESM', ({ describe }) => {
		describe('.mjs extension', ({ describe }) => {
			const output = 'loaded esm-ext-mjs/index.mjs true true';

			describe('full path', ({ test }) => {
				const importPath = './lib/esm-ext-mjs/index.mjs';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stdout).toBe(output);
					expect(nodeProcess.stderr).toBe('');
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					expect(nodeProcess.stderr).toBe('');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					expect(nodeProcess.stderr).toBe('');
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
			const output = 'loaded esm-ext-js/index.js true true';

			describe('full path', ({ test }) => {
				const importPath = './lib/esm-ext-js/index.js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stdout).toBe(output);
					expect(nodeProcess.stderr).toBe('');
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					expect(nodeProcess.stderr).toBe('');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					expect(nodeProcess.stderr).toBe('');
				});
			});

			describe('extensionless', ({ test }) => {
				const importPath = './lib/esm-ext-js/index';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stdout).toBe(output);
					expect(nodeProcess.stderr).toBe('');
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					expect(nodeProcess.stderr).toBe('');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					expect(nodeProcess.stderr).toBe('');
				});
			});

			describe('directory', ({ test }) => {
				const importPath = './lib/esm-ext-js';

				test('Load', async () => {
					const nodeProcess = await node.load(importPath);
					expect(nodeProcess.stdout).toBe(output);
					expect(nodeProcess.stderr).toBe('');
				});

				test('Import', async () => {
					const nodeProcess = await node.import(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					expect(nodeProcess.stderr).toBe('');
				});

				test('Require', async () => {
					const nodeProcess = await node.require(importPath);
					expect(nodeProcess.stdout).toBe(`${output}\n{"default":1234}`);
					expect(nodeProcess.stderr).toBe('');
				});
			});
		});
	});
});
