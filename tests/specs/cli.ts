import path from 'path';
import { testSuite, expect } from 'manten';
import packageJson from '../../package.json';
import { tsx } from '../utils/tsx';

export default testSuite(async ({ describe }, fixturePath: string) => {
	describe('CLI', ({ describe }) => {
		describe('version', ({ test }) => {
			test('shows version', async () => {
				const tsxProcess = await tsx({
					args: ['--version'],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toBe(packageJson.version);
				expect(tsxProcess.stderr).toBe('');
			});

			test('doesn\'t show version with file', async () => {
				const tsxProcess = await tsx({
					args: [
						path.join(fixturePath, 'log-argv.ts'),
						'--version',
					],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch('"--version"');
				expect(tsxProcess.stderr).toBe('');
			});
		});

		describe('help', ({ test }) => {
			test('shows help', async () => {
				const tsxProcess = await tsx({
					args: ['--help'],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch('Node.js runtime enhanced with esbuild for loading TypeScript & ESM');
				expect(tsxProcess.stderr).toBe('');
			});

			test('doesn\'t show help with file', async () => {
				const tsxProcess = await tsx({
					args: [
						path.join(fixturePath, 'log-argv.ts'),
						'--help',
					],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch('"--help"');
				expect(tsxProcess.stderr).toBe('');
			});
		});
	});
});
