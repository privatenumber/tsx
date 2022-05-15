import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.tsx extension', ({ describe }) => {
		const output = `loaded ts-ext-tsx/index.tsx true true ${node.packageType === 'commonjs' ? 'string' : 'undefined'}`;

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-tsx/index.tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-tsx/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(output);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(`${output}\n{"default":["div",null,"hello world"]}`);
			});
		});
	});
});
