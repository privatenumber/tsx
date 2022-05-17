import { testSuite, expect } from 'manten';
import type { NodeApis } from '../../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('.ts extension', ({ describe }) => {
		const output = 'loaded ts-ext-ts/index.ts true true true';
		const outputEsm = `${output} undefined`;
		const outputCjs = `${output} string`;

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
