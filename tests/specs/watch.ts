import path from 'path';
import { testSuite, expect } from 'manten';
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

		}, 2000);

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
	});
});
