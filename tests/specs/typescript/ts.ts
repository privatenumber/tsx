import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.ts extension', ({ describe }) => {
		const output = 'loaded ts-ext-ts/index.ts';
		const outputEsm = `${output} {"nodePrefix":true,"hasDynamicImport":true,"dirname":false,"nameInError":true,"sourceMap":true}`;
		const outputCjs = `${output} {"nodePrefix":true,"hasDynamicImport":true,"dirname":true,"nameInError":true,"sourceMap":true}`;

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index.ts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(node.isCJS ? outputCjs : outputEsm);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				expect(nodeProcess.stdout).toBe(`${node.isCJS ? outputCjs : outputEsm}\n{"default":1234}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				expect(nodeProcess.stdout).toBe(`${outputCjs}\n{"default":1234}`);
				expect(nodeProcess.stderr).toBe('');
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

				expect(nodeProcess.stdout).toBe(`${node.isCJS ? outputCjs : outputEsm}\n{"default":1234}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath, { typescript: true });

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				expect(nodeProcess.stdout).toBe(`${outputCjs}\n{"default":1234}`);
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/ts-ext-ts/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(node.isCJS ? outputCjs : outputEsm);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				expect(nodeProcess.stdout).toBe(`${node.isCJS ? outputCjs : outputEsm}\n{"default":1234}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				expect(nodeProcess.stdout).toBe(`${outputCjs}\n{"default":1234}`);
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/ts-ext-ts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(node.isCJS ? outputCjs : outputEsm);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);

				expect(nodeProcess.stdout).toBe(`${node.isCJS ? outputCjs : outputEsm}\n{"default":1234}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				expect(nodeProcess.stdout).toBe(`${outputCjs}\n{"default":1234}`);
				expect(nodeProcess.stderr).toBe('');
			});
		});
	});
});
