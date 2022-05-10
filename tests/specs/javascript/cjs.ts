import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load CJS', ({ describe }) => {
		describe('.cjs extension', ({ describe }) => {
			const output = 'loaded cjs-ext-cjs/index.cjs true true';

			describe('full path', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs/index.cjs';

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
					expect(nodeProcess.stdout).toBe(`${output}\n1234`);
					expect(nodeProcess.stderr).toBe('');
				});
			});

			describe('extensionless - should not work', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs/index';

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

			describe('directory', ({ test }) => {
				const importPath = './lib/cjs-ext-cjs';

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
			const output = 'loaded cjs-ext-js/index.js true true';

			describe('full path', ({ test }) => {
				const importPath = './lib/cjs-ext-js/index.js';

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
					expect(nodeProcess.stdout).toBe(`${output}\n1234`);
					expect(nodeProcess.stderr).toBe('');
				});
			});

			describe('extensionless', ({ test }) => {
				const importPath = './lib/cjs-ext-js/index';

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
					expect(nodeProcess.stdout).toBe(`${output}\n1234`);
					expect(nodeProcess.stderr).toBe('');
				});
			});

			describe('directory', ({ test }) => {
				const importPath = './lib/cjs-ext-js';

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
					expect(nodeProcess.stdout).toBe(`${output}\n1234`);
					expect(nodeProcess.stderr).toBe('');
				});
			});
		});
	});
});
