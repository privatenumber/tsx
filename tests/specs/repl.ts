import { describe, test } from 'manten';
import { tsx } from '../utils/tsx';
import { processInteract } from '../utils/process-interact.js';

// Node 24 uses "| " for multiline input; older REPLs use "... ".
// https://github.com/nodejs/node/blob/v24.15.0/lib/internal/readline/interface.js#L100
// https://github.com/nodejs/node/blob/v22.22.2/lib/repl.js#L1191-L1198
const isContinuationPrompt = (data: string) => (
	data.includes('... ')
	|| data.includes('| ')
);

export const repl = () => describe('REPL', () => {
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
	}, 10_000);

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
	}, 10_000);

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
					if (isContinuationPrompt(data)) {
						tsxProcess.stdin!.write('1\r');
						return true;
					}
				},
				(data) => {
					if (isContinuationPrompt(data)) {
						tsxProcess.stdin!.write(')\r');
						return true;
					}
				},
				data => data.includes('1'),
			],
			5000,
		);

		tsxProcess.kill();
	}, 10_000);

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
	}, 10_000);
});
