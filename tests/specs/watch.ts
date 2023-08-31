import path from 'path';
import { setTimeout } from 'timers/promises';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { tsx } from '../utils/tsx';

export default testSuite(async ({ describe }, fixturePath: string) => {
	describe('watch', ({ test, describe }) => {
		// test('require file path', async () => {
		// 	const tsxProcess = await tsx({
		// 		args: ['watch'],
		// 	});
		// 	expect(tsxProcess.exitCode).toBe(1);
		// 	expect(tsxProcess.stderr).toMatch('Error: Missing required parameter "script path"');
		// });

		// test('watch files for changes', async ({ onTestFinish }) => {
		// 	const fixture = await createFixture({
		// 		'index.js': 'console.log(1)',
		// 	});

		// 	onTestFinish(async () => await fixture.rm());

		// 	const tsxProcess = tsx({
		// 		args: [
		// 			'watch',
		// 			path.join(fixture.path, 'index.js'),
		// 		],
		// 	});

		// 	await new Promise<void>((resolve) => {
		// 		async function onStdOut(data: Buffer) {
		// 			const chunkString = data.toString();

		// 			if (chunkString.match('1\n')) {
		// 				await fixture.writeFile('index.js', 'console.log(2)');
		// 			} else if (chunkString.match('2\n')) {
		// 				tsxProcess.kill();
		// 				resolve();
		// 			}
		// 		}

		// 		tsxProcess.stdout!.on('data', onStdOut);
		// 		tsxProcess.stderr!.on('data', onStdOut);
		// 	});
		// }, 10_000);

		// test('suppresses warnings & clear screen', async () => {
		// 	const tsxProcess = tsx({
		// 		args: [
		// 			'watch',
		// 			path.join(fixturePath, 'log-argv.ts'),
		// 		],
		// 	});

		// 	const stdout = await new Promise<string>((resolve) => {
		// 		let aggregateStdout = '';
		// 		let hitEnter = false;

		// 		function onStdOut(data: Buffer) {
		// 			const chunkString = data.toString();
		// 			// console.log({ chunkString });

		// 			aggregateStdout += chunkString;

		// 			if (chunkString.match('log-argv.ts')) {
		// 				if (!hitEnter) {
		// 					hitEnter = true;
		// 					tsxProcess.stdin?.write('enter');
		// 				} else {
		// 					tsxProcess.kill();
		// 					resolve(aggregateStdout);
		// 				}
		// 			}
		// 		}
		// 		tsxProcess.stdout!.on('data', onStdOut);
		// 		tsxProcess.stderr!.on('data', onStdOut);
		// 	});

		// 	expect(stdout).not.toMatch('Warning');
		// 	expect(stdout).toMatch('\u001Bc');
		// }, 10_000);

		// test('passes flags', async () => {
		// 	const tsxProcess = tsx({
		// 		args: [
		// 			'watch',
		// 			path.join(fixturePath, 'log-argv.ts'),
		// 			'--some-flag',
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

		// 	expect(stdout).toMatch('"--some-flag"');

		// 	await tsxProcess;
		// }, 10_000);

		test('wait for exit', async ({ onTestFinish }) => {
			const fixture = await createFixture({
				'index.js': `
				console.log('start');
				const sleepSync = (delay) => {
					const waitTill = Date.now() + delay;
					while (Date.now() < waitTill) {}
				};
				process.on('exit', () => {
					sleepSync(300);
					console.log('end');
				});
				`,
			});

			onTestFinish(async () => await fixture.rm());

			const tsxProcess = tsx({
				args: [
					'watch',
					path.join(fixture.path, 'index.js'),
				],
			});

			const stdout = await new Promise<string>((resolve) => {
				const buffers: Buffer[] = [];
				async function onStdOut(data: Buffer) {
					buffers.push(data);
					const chunkString = data.toString();
					if (chunkString.match('start\n')) {
						tsxProcess.stdin?.write('enter');
					} else if (chunkString.match('end\n')) {
						tsxProcess.kill();
						resolve(Buffer.concat(buffers).toString());
					}
				}

				tsxProcess.stdout!.on('data', onStdOut);
				tsxProcess.stderr!.on('data', onStdOut);
			});

			expect(stdout).toMatch(/start[\s\S]+end/);
		}, 10_000);

		// describe('help', ({ test }) => {
		// 	test('shows help', async () => {
		// 		const tsxProcess = await tsx({
		// 			args: ['watch', '--help'],
		// 		});

		// 		expect(tsxProcess.exitCode).toBe(0);
		// 		expect(tsxProcess.stdout).toMatch('Run the script and watch for changes');
		// 		expect(tsxProcess.stderr).toBe('');
		// 	});

		// 	test('passes down --help to file', async () => {
		// 		const tsxProcess = tsx({
		// 			args: [
		// 				'watch',
		// 				path.join(fixturePath, 'log-argv.ts'),
		// 				'--help',
		// 			],
		// 		});

		// 		const stdout = await new Promise<string>((resolve) => {
		// 			tsxProcess.stdout!.on('data', (chunk) => {
		// 				const chunkString = chunk.toString();
		// 				if (chunkString.startsWith('[')) {
		// 					resolve(chunkString);
		// 				}
		// 			});
		// 		});

		// 		tsxProcess.kill();

		// 		expect(stdout).toMatch('"--help"');

		// 		await tsxProcess;
		// 	}, 5000);
		// });

		// describe('ignore', ({ test }) => {
		// 	test('file path & glob', async ({ onTestFinish }) => {
		// 		const entryFile = 'index.js';
		// 		const fileA = 'file-a.js';
		// 		const fileB = 'directory/file-b.js';
		// 		let value = Date.now();

		// 		const fixture = await createFixture({
		// 			[entryFile]: `
		// 				import valueA from './${fileA}'
		// 				import valueB from './${fileB}'
		// 				console.log(valueA, valueB)
		// 			`.trim(),
		// 			[fileA]: `export default ${value}`,
		// 			[fileB]: `export default ${value}`,
		// 		});

		// 		onTestFinish(async () => await fixture.rm());

		// 		const tsxProcess = tsx({
		// 			cwd: fixture.path,
		// 			args: [
		// 				'watch',
		// 				'--clear-screen=false',
		// 				`--ignore=${fileA}`,
		// 				`--ignore=${path.join(fixture.path, 'directory/*')}`,
		// 				entryFile,
		// 			],
		// 		});

		// 		tsxProcess.stdout!.on('data', async (data: Buffer) => {
		// 			const chunkString = data.toString();
		// 			if (chunkString === `${value} ${value}\n`) {
		// 				value = Date.now();
		// 				await Promise.all([
		// 					fixture.writeFile(fileA, `export default ${value}`),
		// 					fixture.writeFile(fileB, `export default ${value}`),
		// 				]);

		// 				await setTimeout(500);
		// 				await fixture.writeFile(entryFile, 'console.log("TERMINATE")');
		// 			}

		// 			if (chunkString === 'TERMINATE\n') {
		// 				tsxProcess.kill();
		// 			}
		// 		});

		// 		const tsxProcessResolved = await tsxProcess;

		// 		expect(tsxProcessResolved.stdout).not.toMatch(`${value} ${value}`);
		// 		expect(tsxProcessResolved.stderr).toBe('');
		// 	}, 10_000);
		// });
	});
});
