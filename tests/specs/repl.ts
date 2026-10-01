import { describe, test } from 'manten';
import { spawn, waitFor } from 'pty-spawn';
import stripAnsi from 'strip-ansi';
import { tsx, tsxPath } from '../utils/tsx';
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
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('const message: string = "SUCCESS"\r');
						return true;
					}
				},
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('message\r');
						return true;
					}
				},
				({ output }) => output.includes('SUCCESS'),
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
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('require("path")\r');
						return true;
					}
				},
				({ output }) => output.includes('[Function: resolve]'),
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
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('(\r');
						return true;
					}
				},
				({ chunk }) => {
					if (isContinuationPrompt(chunk)) {
						tsxProcess.stdin!.write('1\r');
						return true;
					}
				},
				({ chunk }) => {
					if (isContinuationPrompt(chunk)) {
						tsxProcess.stdin!.write(')\r');
						return true;
					}
				},
				({ chunk }) => chunk.includes('1'),
			],
			5000,
		);

		tsxProcess.kill();
	}, 10_000);

	test('supports multi-line TypeScript input', async () => {
		const tsxProcess = tsx({
			args: ['--interactive'],
		});

		await processInteract(
			tsxProcess.stdout!,
			[
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('function greet(name: string): string {\r');
						return true;
					}
				},
				({ chunk }) => {
					if (isContinuationPrompt(chunk)) {
						tsxProcess.stdin!.write('return "hello " + name\r');
						return true;
					}
				},
				({ chunk }) => {
					if (isContinuationPrompt(chunk)) {
						tsxProcess.stdin!.write('}\r');
						return true;
					}
				},
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('greet("tsx")\r');
						return true;
					}
				},
				({ output }) => output.includes("'hello tsx'"),
			],
			5000,
		);

		tsxProcess.kill();
	}, 10_000);

	test('supports pasting multi-line TypeScript input', async () => {
		const tsxProcess = tsx({
			args: ['--interactive'],
		});

		await processInteract(
			tsxProcess.stdout!,
			[
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('function greet(name: string): string {\rreturn "hello " + name\r}\rgreet("tsx")\r');
						return true;
					}
				},
				({ output }) => output.includes("'hello tsx'"),
			],
			5000,
		);

		tsxProcess.kill();
	}, 10_000);

	// In a terminal, Node 24 joins multi-line input with carriage returns
	test('supports multi-line TypeScript input in a terminal', async () => {
		await using tsxProcess = spawn(process.execPath, [tsxPath], { reject: false });
		const signal = AbortSignal.timeout(5000);
		const waitForOutput = (
			predicate: (output: string) => boolean,
		) => waitFor(tsxProcess, output => predicate(stripAnsi(output)), { signal });

		await waitForOutput(output => output.includes('> '));
		tsxProcess.stdin.write('function greet(name: string): string {\r');
		await waitForOutput(isContinuationPrompt);
		tsxProcess.stdin.write('return "hello " + name\r');
		await waitForOutput(isContinuationPrompt);
		tsxProcess.stdin.write('}\r');
		await waitForOutput(output => output.includes('> '));
		tsxProcess.stdin.write('greet("tsx")\r');
		await waitForOutput(output => output.includes("'hello tsx'"));
	}, 10_000);

	test('supports multi-line template literal after TypeScript syntax', async () => {
		const tsxProcess = tsx({
			args: ['--interactive'],
		});

		await processInteract(
			tsxProcess.stdout!,
			[
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('const text: string = `first\r');
						return true;
					}
				},
				({ chunk }) => {
					if (isContinuationPrompt(chunk)) {
						tsxProcess.stdin!.write('second`\r');
						return true;
					}
				},
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('text.split("\\n")\r');
						return true;
					}
				},
				({ output }) => output.includes("[ 'first', 'second' ]"),
			],
			5000,
		);

		tsxProcess.kill();
	}, 10_000);

	test('reports syntax error that is not at end of input', async () => {
		const tsxProcess = tsx({
			args: ['--interactive'],
		});

		await processInteract(
			tsxProcess.stdout!,
			[
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('const text: string = "unterminated\r');
						return true;
					}
				},
				({ output }) => output.includes('SyntaxError'),
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
				({ chunk }) => {
					if (chunk.includes('> ')) {
						tsxProcess.stdin!.write('import fs from "fs"\r');
						return true;
					}
				},
				({ output }) => output.includes('SyntaxError: Cannot use import statement'),
			],
			5000,
		);

		tsxProcess.kill();
	}, 10_000);
});
