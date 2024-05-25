import { testSuite } from 'manten';
import { tsx } from '../utils/tsx';
import { processInteract } from '../utils/process-interact.js';

export default testSuite(async ({ describe }) => {
	describe('REPL', ({ test }) => {
		test('handles ts', async () => {
			const tsxProcess = tsx({
				args: ['--interactive'],
			});

			await processInteract(
				tsxProcess.stdout!,
				[
					(data) => {
						if (data.includes('> ')) {
							tsxProcess.stdin!.write('const message: string = "SUCCESS"\r');
							return true;
						}
					},
					(data) => {
						if (data.includes('> ')) {
							tsxProcess.stdin!.write('message\r');
							return true;
						}
					},
					data => data.includes('SUCCESS'),
				],
				5000,
			);

			tsxProcess.kill();
		}, 40_000);

		test('doesn\'t error on require', async () => {
			const tsxProcess = tsx({
				args: ['--interactive'],
			});

			await processInteract(
				tsxProcess.stdout!,
				[
					(data) => {
						if (data.includes('> ')) {
							tsxProcess.stdin!.write('require("path")\r');
							return true;
						}
					},
					data => data.includes('[Function: resolve]'),
				],
				5000,
			);

			tsxProcess.kill();
		}, 40_000);

		test('supports incomplete expression in segments', async () => {
			const tsxProcess = tsx({
				args: ['--interactive'],
			});

			await processInteract(
				tsxProcess.stdout!,
				[
					(data) => {
						if (data.includes('> ')) {
							tsxProcess.stdin!.write('(\r');
							return true;
						}
					},
					(data) => {
						if (data.includes('... ')) {
							tsxProcess.stdin!.write('1\r');
							return true;
						}
					},
					(data) => {
						if (data.includes('... ')) {
							tsxProcess.stdin!.write(')\r');
							return true;
						}
					},
					data => data.includes('1'),
				],
				5000,
			);

			tsxProcess.kill();
		}, 40_000);

		test('errors on import statement', async () => {
			const tsxProcess = tsx({
				args: ['--interactive'],
			});

			await processInteract(
				tsxProcess.stdout!,
				[
					(data) => {
						if (data.includes('> ')) {
							tsxProcess.stdin!.write('import fs from "fs"\r');
							return true;
						}
					},
					data => data.includes('SyntaxError: Cannot use import statement'),
				],
				5000,
			);

			tsxProcess.kill();
		}, 40_000);
	});
});
