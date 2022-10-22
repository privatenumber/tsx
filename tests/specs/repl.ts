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

					console.log({ chunkString });

					if (chunkString.includes('SUCCESS')) {
						return resolve();
					}

					if (chunkString.includes('> ') && commands.length > 0) {
						const command = commands.shift();
						tsxProcess.stdin?.write(`${command}\n`);
					}
				});
			});

			tsxProcess.kill();
		}, 5000);

		test('doesn\'t error on require', async () => {
			const tsxProcess = node.tsx({
				args: ['--interactive'],
			});

			await new Promise<void>((resolve, reject) => {
				tsxProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();

					console.log({ chunkString });

					if (chunkString.includes('unsupported-require-call')) {
						return reject(chunkString);
					}

					if (chunkString.includes('[Function: resolve]')) {
						return resolve();
					}

					if (chunkString.includes('> ')) {
						tsxProcess.stdin?.write('require("path")\n');
					}
				});
			});

			tsxProcess.kill();
		}, 5000);

		test('errors on import statement', async () => {
			const tsxProcess = node.tsx({
				args: ['--interactive'],
			});

			await new Promise<void>((resolve) => {
				tsxProcess.stdout!.on('data', (data: Buffer) => {
					const chunkString = data.toString();

					console.log({ chunkString });

					if (chunkString.includes('SyntaxError: Cannot use import statement')) {
						return resolve();
					}

					if (chunkString.includes('> ')) {
						tsxProcess.stdin?.write('import fs from "fs"\n');
					}
				});
			});

			tsxProcess.kill();
		}, 5000);
	});
});
