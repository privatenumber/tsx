import path from 'path';
import { testSuite, expect } from 'manten';
import { tsx } from '../utils/tsx';
import type { NodeApis } from '../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('Binary', ({ test }) => {
		test('missing binary falls back to file-system', async () => {
			const tsxProcess = await tsx({
				args: ['missing-binary'],
				cwd: path.resolve('./tests/fixtures/'),
				nodePath: node.path,
			});

			expect(tsxProcess.exitCode).toBe(1);
			expect(tsxProcess.stdout).toBe('');
			expect(tsxProcess.stderr).toMatch('ERR_MODULE_NOT_FOUND');
		});

		test('file path to be ignored as binary', async () => {
			const tsxProcess = await tsx({
				args: ['./binary'],
				cwd: path.resolve('./tests/fixtures'),
			});

			expect(tsxProcess.exitCode).toBe(1);
			expect(tsxProcess.stdout).toBe('');
			expect(tsxProcess.stderr).toMatch('ERR_MODULE_NOT_FOUND');
		});

		test('binary to run', async () => {
			const tsxProcess = await tsx({
				args: ['binary', 'hello', 'world', 'binary'],
				cwd: path.resolve('./tests/fixtures'),
			});

			expect(tsxProcess.exitCode).toBe(0);
			expect(tsxProcess.stdout).toBe('["hello","world","binary"]');
			expect(tsxProcess.stderr).toBe('');
		});
	});
});
