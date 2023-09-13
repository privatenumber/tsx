import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load JSON', async ({ describe, onFinish }) => {
		const fixture = await createFixture({
			'index.json': JSON.stringify({
				loaded: 'json',
			}),
		});

		onFinish(async () => await fixture.rm());

		describe('full path', async ({ test }) => {
			const importPath = path.join(fixture.path, 'index.json');
			test('Load', async () => {
				const nodeProcess = await node.load(fixture.path);
				expect(nodeProcess.stdout).toBe('');
				expect(nodeProcess.exitCode).toBe(0);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe('{"default":{"loaded":"json"},"loaded":"json"}');
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe('{"loaded":"json"}');
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('extensionless', ({ test }) => {
			const importPath = path.join(fixture.path, 'index');

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe('');
				expect(nodeProcess.exitCode).toBe(0);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe('{"default":{"loaded":"json"},"loaded":"json"}');
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe('{"loaded":"json"}');
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('directory', ({ test }) => {
			const importPath = fixture.path;

			test('Load', async () => {
				const nodeProcess = await node.load(importPath);
				expect(nodeProcess.stdout).toBe('');
				expect(nodeProcess.exitCode).toBe(0);
			});

			test('Import', async () => {
				const nodeProcess = await node.import(importPath);
				expect(nodeProcess.stdout).toBe('{"default":{"loaded":"json"},"loaded":"json"}');
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.require(importPath);
				expect(nodeProcess.stdout).toBe('{"loaded":"json"}');
				expect(nodeProcess.stderr).toBe('');
			});
		});
	});
});
