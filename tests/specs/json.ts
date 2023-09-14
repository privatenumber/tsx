import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Load JSON', async ({ describe, onFinish }) => {
		const fixture = await createFixture({
			'package.json': JSON.stringify({
				type: node.packageType,
			}),
			'index.json': JSON.stringify({
				loaded: 'json',
			}),
		});

		onFinish(async () => await fixture.rm());

		describe('full path', async ({ test }) => {
			test('Load', async () => {
				const nodeProcess = await node.loadFile(fixture.path, './index.json');
				expect(nodeProcess.stdout).toBe('');
				expect(nodeProcess.exitCode).toBe(0);
			});

			test('Import', async () => {
				const nodeProcess = await node.importFile(fixture.path, './index.json');
				expect(nodeProcess.stdout).toMatch('default: { loaded: \'json\' }');
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.requireFile(fixture.path, './index.json');
				expect(nodeProcess.stdout).toBe('{ loaded: \'json\' }');
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('extensionless', ({ test }) => {
			test('Load', async () => {
				const nodeProcess = await node.loadFile(fixture.path, './index');
				expect(nodeProcess.stdout).toBe('');
				expect(nodeProcess.exitCode).toBe(0);
			});

			test('Import', async () => {
				const nodeProcess = await node.importFile(fixture.path, './index');
				expect(nodeProcess.stdout).toMatch('default: { loaded: \'json\' }');
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.requireFile(fixture.path, './index');
				expect(nodeProcess.stdout).toBe('{ loaded: \'json\' }');
				expect(nodeProcess.stderr).toBe('');
			});
		});

		describe('directory', ({ test }) => {
			test('Load', async () => {
				const nodeProcess = await node.loadFile(fixture.path, '.');
				expect(nodeProcess.stdout).toBe('');
				expect(nodeProcess.exitCode).toBe(0);
			});

			test('Import', async () => {
				const nodeProcess = await node.importFile(fixture.path, '.');
				expect(nodeProcess.stdout).toMatch('default: { loaded: \'json\' }');
				expect(nodeProcess.stderr).toBe('');
			});

			test('Require', async () => {
				const nodeProcess = await node.requireFile(fixture.path, '.');
				expect(nodeProcess.stdout).toBe('{ loaded: \'json\' }');
				expect(nodeProcess.stderr).toBe('');
			});
		});
	});
});
