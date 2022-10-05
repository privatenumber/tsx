import path from 'path';
import { expect, testSuite } from 'manten';
import { createFixture } from 'fs-fixture';
import { findTestFiles } from '../../src/test-runner/util';
import { tsx } from '../utils/tsx';

const suite = testSuite(async ({ describe }) => {
	describe('node test runner', async ({ describe }) => {
		await describe('via cli', ({ test }) => {
			test('should run tests when only flag is supplied', async () => {
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
				expect(aggregatedOutput).toMatch('tests 4');
				await fixtures.rm();
			});

			test('should run multiple test files supplied as args', async () => {
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

		describe('find files utility', ({ describe }) => {
			describe('in flat hierarchy', ({ test }) => {
				const testFileSchemas = [
					// test.js, test.cjs, ...
					...['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts']
						.map(extension => `test${extension}`),
					// foo.test.ts, foo-test.ts, foo_test.ts, foo.test.mts, ...
					...['.js', '.cjs', '.mjs', '.ts', '.cts', '.mts']
						.flatMap(extension => ['.', '-', '_'].map(delimiter => `foo${delimiter}test${extension}`)),
				];

				testFileSchemas.forEach(filename => test(`should identify '${filename}' as test file`, async () => {
					// given
					const fixture = await createFixture({
						[filename]: '',
					});

					// when
					const testFiles = findTestFiles(fixture.path);

					// then
					expect(testFiles).toEqual([path.join(fixture.path, filename)]);
					await fixture.rm();
				}));
			});

			describe('in nested hierarchy', ({ test }) => {
				test('should find nested test file', async () => {
					// given
					const fixture = await createFixture({
						foo: {
							'bar.test.ts': '',
						},
					});

					// when
					const testFiles = findTestFiles(fixture.path);

					// then
					expect(testFiles).toEqual([path.join(fixture.path, 'foo/bar.test.ts')]);
					await fixture.rm();
				});

				test('should find nested test directory files', async () => {
					// given
					const fixture = await createFixture({
						foo: {
							test: {
								'bar.ts': '',
							},
						},
					});

					// when
					const testFiles = findTestFiles(fixture.path);

					// then
					expect(testFiles).toEqual([path.join(fixture.path, 'foo/test/bar.ts')]);
					await fixture.rm();
				});
			});
		});
	});
});

export default suite;
