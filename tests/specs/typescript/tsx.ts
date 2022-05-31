import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.tsx extension', ({ describe }) => {
		const output = 'loaded ts-ext-tsx/index.tsx';
		const outputEsm = `${output} {"nodePrefix":true,"hasDynamicImport":true,"dirname":false,"nameInError":true,"sourceMap":false}`;
		const outputCjs = `${output} {"nodePrefix":true,"hasDynamicImport":true,"dirname":true,"nameInError":true,"sourceMap":false}`;

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-tsx/index.tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(node.isCJS ? outputCjs : outputEsm);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				expect(nodeProcess.stdout).toBe(`${node.isCJS ? outputCjs : outputEsm}\n{"default":["div",null,"hello world"]}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				expect(nodeProcess.stdout).toBe(`${outputCjs}\n{"default":["div",null,"hello world"]}`);
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-tsx/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(node.isCJS ? outputCjs : outputEsm);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe(`${node.isCJS ? outputCjs : outputEsm}\n{"default":["div",null,"hello world"]}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				expect(nodeProcess.stdout).toBe(`${outputCjs}\n{"default":["div",null,"hello world"]}`);
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-tsx';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(node.isCJS ? outputCjs : outputEsm);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe(`${node.isCJS ? outputCjs : outputEsm}\n{"default":["div",null,"hello world"]}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				expect(nodeProcess.stdout).toBe(`${outputCjs}\n{"default":["div",null,"hello world"]}`);
				expect(nodeProcess.stderr).toBe('');
			});
		});
	});
});
