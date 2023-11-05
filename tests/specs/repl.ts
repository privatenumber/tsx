import { testSuite } from 'manten';
import { tsx } from '../utils/tsx';

export default testSuite(async ({ describe }) => {
	describe('REPL', ({ test }) => {
		test('handles ts', async () => {
			const tsxProcess = tsx({
				args: ['--interactive'],
			});

			const commands = [
				'const message: string = "SUCCESS"',
				'message',
			];

			await new Promise<void>((resolve) => {
				tsxProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();

					if (chunkString.includes('SUCCESS')) {
						return resolve();
					}

					if (chunkString.includes('> ') && commands.length > 0) {
						const command = commands.shift();
						tsxProcess.stdin!.write(`${command}\r`);
					}
				});
			});

			tsxProcess.kill();
		}, 40_000);

		test('doesn\'t error on require', async () => {
			const tsxProcess = tsx({
				args: ['--interactive'],
			});

			await new Promise<void>((resolve, reject) => {
				tsxProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();

					if (chunkString.includes('unsupported-require-call')) {
						return reject(chunkString);
					}

					if (chunkString.includes('[Function: resolve]')) {
						return resolve();
					}

					if (chunkString.includes('> ')) {
						tsxProcess.stdin!.write('require("path")\r');
					}
				});
			});

			tsxProcess.kill();
		}, 40_000);

		test('supports incomplete expression in segments', async () => {
			const tsxProcess = tsx({
				args: ['--interactive'],
			});

			const commands = [
				['> ', '('],
				['... ', '1'],
				['... ', ')'],
				['1'],
			];

			let [expected, nextCommand] = commands.shift()!;
			await new Promise<void>((resolve) => {
				tsxProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();
					if (chunkString.includes(expected)) {
						if (nextCommand) {
							tsxProcess.stdin!.write(`${nextCommand}\r`);
							[expected, nextCommand] = commands.shift()!;
						} else {
							resolve();
						}
					}
				});
			});
			tsxProcess.kill();
		}, 40_000);

		test('errors on import statement', async () => {
			const tsxProcess = tsx({
				args: ['--interactive'],
			});

			await new Promise<void>((resolve) => {
				tsxProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();

					if (chunkString.includes('SyntaxError: Cannot use import statement')) {
						return resolve();
					}

					if (chunkString.includes('> ')) {
						tsxProcess.stdin!.write('import fs from "fs"\r');
					}
				});
			});

			tsxProcess.kill();
		}, 40_000);
	});
});
