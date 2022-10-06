import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
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

		describe('unknown flag', ({ test }) => {
			test('should pass any flag to node process', async () => {
				// given
				const logMessage = 'hello world';
				const filename = 'log-hello-world.js';
				const fixture = await createFixture({
					[filename]: `console.log('${logMessage}')`,
				});

				// when
				const tsxProcess = await tsx({
					args: [
						'--require',
						path.join(fixture.path, filename),
						path.join(fixturePath, 'log-argv.ts'),
					],
				});

				// then
				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch(logMessage);
				expect(tsxProcess.stderr).toBe('');
			});
		});

		describe('test (node flag)', ({ test }) => {
			test('should run only non-typescript tests when flag without args is given', async () => {
				// given
				const fixtures = await createFixture({
					'foo.test.js': '',
					'foo.test.ts': '',
					test: {
						'bar.js': '',
						'bar.ts': '',
					},
				});

				const tsxProcess = tsx({
					cwd: fixtures.path,
					args: [
						'--test',
					],
				});

				let aggregatedOutput = '';
				tsxProcess.stdout?.on('data', (chunk) => {
					aggregatedOutput += chunk.toString();
					tsxProcess.kill();
				});
				tsxProcess.stderr?.on('data', () => {
					tsxProcess.kill();
				});

				// when
				await tsxProcess;

				// then
				expect(aggregatedOutput).toMatch('tests 2');
				await fixtures.rm();
			});

			test('should run multiple test files given as args', async () => {
				// given
				const fixtures = await createFixture({
					'foo.test.ts': '',
					test: {
						'bar.js': '',
					},
				});

				const tsxProcess = tsx({
					cwd: fixtures.path,
					args: [
						'--test',
						'foo.test.ts',
						'test/bar.js',
					],
				});

				let aggregatedOutput = '';
				tsxProcess.stdout?.on('data', (chunk) => {
					aggregatedOutput += chunk.toString();
					tsxProcess.kill();
				});
				tsxProcess.stderr?.on('data', (chunk) => {
					aggregatedOutput += chunk.toString();
					tsxProcess.kill();
				});

				// when
				await tsxProcess;

				// then
				expect(aggregatedOutput).toMatch('tests 2');
				await fixtures.rm();
			});
		});
	});
});
