import path from 'path';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { tsx } from '../utils/tsx';

export default testSuite(async ({ describe }, fixturePath: string) => {
	describe('watch', ({ test, describe }) => {
		test('require file path', async () => {
			const tsxProcess = await tsx({
				args: ['watch'],
			});
			expect(tsxProcess.exitCode).toBe(1);
			expect(tsxProcess.stderr).toMatch('Error: Missing required parameter "script path"');
		});

		test('watch files for changes', async () => {
			const fixture = await createFixture({
				'index.js': 'console.log(1)',
			});

			const tsxProcess = tsx({
				args: [
					'watch',
					path.join(fixture.path, 'index.js'),
				],
			});

			await new Promise<void>((resolve) => {
				async function onStdOut(data: Buffer) {
					const chunkString = data.toString();

					if (chunkString.match('1\n')) {
						await fixture.writeFile('index.js', 'console.log(2)');
					} else if (chunkString.match('2\n')) {
						tsxProcess.kill();
						resolve();
					}
				}

				tsxProcess.stdout!.on('data', onStdOut);
				tsxProcess.stderr!.on('data', onStdOut);
			});
		}, 5000);

		test('suppresses warnings & clear screen', async () => {
			const tsxProcess = tsx({
				args: [
					'watch',
					path.join(fixturePath, 'log-argv.ts'),
				],
			});

			const stdout = await new Promise<string>((resolve) => {
				let aggregateStdout = '';
				let hitEnter = false;

				function onStdOut(data: Buffer) {
					const chunkString = data.toString();
					// console.log({ chunkString });

					aggregateStdout += chunkString;

					if (chunkString.match('log-argv.ts')) {
						if (!hitEnter) {
							hitEnter = true;
							tsxProcess.stdin?.write('enter');
						} else {
							tsxProcess.kill();
							resolve(aggregateStdout);
						}
					}
				}
				tsxProcess.stdout!.on('data', onStdOut);
				tsxProcess.stderr!.on('data', onStdOut);
			});

			expect(stdout).not.toMatch('Warning');
			expect(stdout).toMatch('\u001Bc');
		}, 5000);

		test('passes flags', async () => {
			const tsxProcess = tsx({
				args: [
					'watch',
					path.join(fixturePath, 'log-argv.ts'),
					'--some-flag',
				],
			});

			const stdout = await new Promise<string>((resolve) => {
				tsxProcess.stdout!.on('data', (chunk) => {
					const chunkString = chunk.toString();
					if (chunkString.startsWith('[')) {
						resolve(chunkString);
					}
				});
			});

			tsxProcess.kill();

			expect(stdout).toMatch('"--some-flag"');

			await tsxProcess;
		}, 5000);

		describe('help', ({ test }) => {
			test('shows help', async () => {
				const tsxProcess = await tsx({
					args: ['watch', '--help'],
				});

				expect(tsxProcess.exitCode).toBe(0);
				expect(tsxProcess.stdout).toMatch('Run the script and watch for changes');
				expect(tsxProcess.stderr).toBe('');
			});

			// BUGL Currently doesn't pass through `--help
			// test('doesn\'t show help with file', async () => {
			// 	const tsxProcess = tsx({
			// 		args: [
			// 			'watch',
			// 			path.join(fixturePath, 'log-argv.ts'),
			// 			'--help',
			// 		],
			// 	});

			// 	const stdout = await new Promise<string>((resolve) => {
			// 		tsxProcess.stdout!.on('data', (chunk) => {
			// 			const chunkString = chunk.toString();
			// 			if (chunkString.startsWith('[')) {
			// 				resolve(chunkString);
			// 			}
			// 		});
			// 	});

			// 	tsxProcess.kill();

			// 	console.log(stdout);
			// 	expect(stdout).toMatch('"--help"');

			// 	await tsxProcess;
			// }, 2000);
		});

		describe('ignore', ({ test }) => {
			test('multiple files ignored', async () => {
				// given
				const initialValue = 'first round';
				const alteredValue = 'second round';
				const includedFilename = 'included.js';
				const ignoredFilenames = ['ignored-1.js', 'ignored-2.js'];

				const fixtures = await createFixture({
					[includedFilename]: `
						import { value as value1 } from './ignored-1';
						import { value as value2 } from './ignored-2';
						console.log(value1 + value2);
					`.trim(),
					[ignoredFilenames[0]]: `export const value = '${initialValue}';`,
					[ignoredFilenames[1]]: `export const value = '${initialValue}';`,
				});

				const tsxProcess = tsx({
					args: [
						'watch',
						'--clear-screen=false',
						`--ignored=${path.join(fixtures.path, ignoredFilenames[0])}`,
						`--ignored=${path.join(fixtures.path, ignoredFilenames[1])}`,
						path.join(fixtures.path, includedFilename),
					],
				});

				let aggregatedOutput = '';
				async function onStdOut(data: Buffer) {
					const chunkString = data.toString();
					aggregatedOutput += chunkString;

					if (new RegExp(`${initialValue}\n`).test(chunkString)) {
						await Promise.all(ignoredFilenames.map(ignoredFilename => fixtures.writeFile(ignoredFilename, `export const value = '${alteredValue}';`)));
						// make sure to wait for chokidar to pick up changes
						// in the ignored file before manually triggering a rerun
						setTimeout(async () => {
							await fixtures.writeFile(includedFilename, 'console.log(\'TERMINATE\');');
						}, 500);
					} else if (chunkString.match('TERMINATE\n')) {
						// cleanup
						await fixtures.rm();
						tsxProcess.kill();
					}
				}
				tsxProcess.stdout?.on('data', onStdOut);

				let error = false;
				tsxProcess.stderr?.on('data', () => {
					error = true;
				});

				// when
				await tsxProcess;

				// then
				if (error) {
					// manten does not come with a fail() utility.
					expect('No error throwing').toEqual('but was thrown.');
				}
				expect(aggregatedOutput).not.toMatch(alteredValue);
			});
		});
	});
});
