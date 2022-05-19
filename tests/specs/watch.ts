import path from 'path';
import { testSuite, expect } from 'manten';
import { tsx } from '../utils/tsx';

export default testSuite(async ({ describe }, fixturePath: string) => {
	describe('watch', ({ test }) => {
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
	});
});
