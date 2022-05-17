import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.mts extension', ({ describe }) => {
		const output = 'loaded ts-ext-mts/index.mts true true true';
		const outputEsm = `${output} undefined`;
		const outputCjs = `${output} string`;

		describe('full path', ({ test }) => {
			const importPath = './lib/ts-ext-mts/index.mts';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe(outputEsm);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe(`${outputEsm}\n{"default":1234}`);
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);

				// By "require()"ing an ESM file, it forces it to be compiled in a CJS context
				expect(nodeProcess.stdout).toBe(`${outputCjs}\n{"default":1234}`);
			});
		});

		describe('full path via .mjs', ({ test }) => {
			const importPath = './lib/ts-ext-mts/index.mjs';

			test('Load - should not work', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stderr).toMatch('Cannot find module');
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath, { typescript: true });
				expect(nodeProcess.stdout).toBe(`${outputEsm}\n{"default":1234}`);
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath, { typescript: true });
				expect(nodeProcess.stdout).toBe(`${outputCjs}\n{"default":1234}`);
			});
		});

		describe('extensionless - should not work', ({ test }) => {
			const importPath = './lib/ts-ext-mts/index';

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
			const importPath = './lib/ts-ext-mts';

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
