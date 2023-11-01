import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/node-with-loader.js';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Negative tests', ({ test }) => {
		test('should not load .txt files', async ({ onTestFinish }) => {
			const fixture = await createFixture({
				'file.txt': 'Hello world',
				'index.js': 'import file from "./file.txt";console.log(file);',
			});

			onTestFinish(async () => await fixture.rm());

			const nodeProcess = await node.load(path.join(fixture.path, 'index.js'));
			expect(nodeProcess.stdout).toBe('');
			expect(nodeProcess.stderr).toMatch('SyntaxError: Unexpected identifier');
		});
	});
});
