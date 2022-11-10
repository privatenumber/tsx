import { testSuite } from 'manten';
import { type NodeApis } from '../utils/tsx';

export default testSuite(async ({ describe }, node: NodeApis) => {
	describe('repl', ({ test }) => {
		test('handles ts', async () => {
			const tsxProcess = node.tsx({
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
		}, 30_000);

		test('doesn\'t error on require', async () => {
			const tsxProcess = node.tsx({
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
		}, 30_000);

		test('errors on import statement', async ({ onTestFail }) => {
			const startTime = Date.now();
			const tsxProcess = node.tsx({
				args: ['--interactive'],
			});

			const chunks: string[] = [];
			onTestFail(() => {
				console.log('tsxProcess', tsxProcess);
				console.log('chunks', chunks);
			});

			tsxProcess.stderr!.on('data', (data: Buffer) => {
				const chunkString = data.toString();

				chunks.push(`error: ${chunkString}`);
			});

			await new Promise<void>((resolve) => {
				tsxProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();

					chunks.push(`${Date.now() - startTime} ${chunkString}`);

					if (chunkString.includes('SyntaxError: Cannot use import statement')) {
						chunks.push('resolved');
						return resolve();
					}

					if (chunkString.includes('> ')) {
						tsxProcess.stdin!.write('import fs from "fs"\r\n');
						chunks.push(`${Date.now() - startTime} wrote import`);
					}
				});
			});

			tsxProcess.kill();

			console.log('done', Date.now() - startTime);
		}, 30_000);
	});
});
