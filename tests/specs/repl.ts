import { testSuite } from 'manten';
import { tsx } from '../utils/tsx';

export default testSuite(async ({ describe }) => {
	describe('repl', ({ test }) => {
		test('handles ts', async () => {
			const tsxProcess = tsx({
				args: [],
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
						tsxProcess.stdin?.write(`${command}\n`);
					}
				});
			});

			tsxProcess.kill();
		}, 5000);
	});
});
