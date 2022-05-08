import { testSuite, expect } from 'manten';
import type { NodeApis } from '../utils/esb';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load JSON', ({ describe }) => {
		const output = '{"loaded":"json"}';

		describe('full path', ({ test }) => {
			const importPath = './lib/json/index.json';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe('');
				expect(nodeProcess.exitCode).toBe(0);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe(`{"default":${output}}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = './lib/json/index';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe('');
				expect(nodeProcess.exitCode).toBe(0);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe(`{"default":${output}}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('directory', ({ test }) => {
			const importPath = './lib/json';

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe('');
				expect(nodeProcess.exitCode).toBe(0);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe(`{"default":${output}}`);
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe(output);
				expect(nodeProcess.stderr).toBe('');
			});
		});
	});
});
