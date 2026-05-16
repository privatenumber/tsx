import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import {
	describe, test, expect,
} from 'manten';
import { execaNode } from 'execa';
import { createFixture } from 'fs-fixture';
import { tsxEsmApiPath, tsxEsmPath, type NodeApis } from '../utils/tsx';
import { createPackageJson } from '../fixtures';
import { processInteract } from '../utils/process-interact.js';

// Lightweight tests for behaviors that vary across Node versions.
// Run on every Node version in the CI matrix.
export const versionSensitiveTests = (node: NodeApis) => describe('Version-sensitive', async () => {
	if (node.supports.moduleRegisterHooksCjsReload) {
		test('composes with other registerHooks loaders', async () => {
			await using fixture = await createFixture({
				'observer.mjs': `
					import { registerHooks } from 'node:module';

					const events = [];
					const record = (event) => {
						events.push(event);
					};

					registerHooks({
						resolve(specifier, context, nextResolve) {
							const result = nextResolve(specifier, context);
							if (specifier.endsWith('.ts')) {
								record({
									hook: 'resolve',
									specifier,
									format: result.format ?? null,
								});
							}
							return result;
						},
						load(url, context, nextLoad) {
							const result = nextLoad(url, context);
							if (url.endsWith('.ts')) {
								record({
									hook: 'load',
									file: url.slice(url.lastIndexOf('/') + 1),
									format: result.format ?? null,
									sourceType: typeof result.source,
								});
							}
							return result;
						},
					});

					process.once('beforeExit', () => {
						console.log(JSON.stringify(events));
					});
					`,
				'entry.ts': `
					import { value } from './value.ts';

					console.log(\`entry:\${value}\`);
					`,
				'value.ts': 'export const value: string = "loaded";',
			});

			const run = async (
				nodeOptions: string[],
				expectedEvents: unknown[],
			) => {
				const process = await execaNode(fixture.getPath('entry.ts'), {
					nodePath: node.path,
					nodeOptions,
					reject: false,
				});

				expect(process.exitCode).toBe(0);
				expect(process.stderr).toBe('');
				const stdoutLines = process.stdout.split('\n');
				expect(stdoutLines[0]).toBe('entry:loaded');
				expect(JSON.parse(stdoutLines[1])).toEqual(expectedEvents);
			};
			const observerUrl = pathToFileURL(fixture.getPath('observer.mjs')).toString();

			await run(
				['--import', observerUrl, '--import', tsxEsmPath],
				[
					{
						hook: 'resolve',
						specifier: pathToFileURL(fixture.getPath('entry.ts')).toString(),
						format: null,
					},
					{
						hook: 'load',
						file: 'entry.ts',
						format: 'commonjs',
						sourceType: 'object',
					},
					{
						hook: 'resolve',
						specifier: pathToFileURL(fixture.getPath('value.ts')).toString(),
						format: null,
					},
					{
						hook: 'load',
						file: 'value.ts',
						format: 'commonjs',
						sourceType: 'object',
					},
				],
			);
			await run(
				['--import', tsxEsmPath, '--import', observerUrl],
				[
					{
						hook: 'resolve',
						specifier: pathToFileURL(fixture.getPath('entry.ts')).toString(),
						format: 'commonjs',
					},
					{
						hook: 'load',
						file: 'entry.ts',
						format: 'commonjs',
						sourceType: 'string',
					},
					{
						hook: 'resolve',
						specifier: pathToFileURL(fixture.getPath('value.ts')).toString(),
						format: 'commonjs',
					},
					{
						hook: 'load',
						file: 'value.ts',
						format: 'commonjs',
						sourceType: 'string',
					},
				],
			);
		});

		await test('watch reruns when imported TypeScript file changes', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'index.ts': `
					import { value } from './value.ts';
					console.log(value);
					`,
				'value.ts': 'export const value = "first";',
			});

			const tsxProcess = node.tsx(['watch', '--clear-screen=false', 'index.ts'], fixture.path);

			let output = '';
			await processInteract(
				tsxProcess.stdout!,
				[
					async (data) => {
						output += data;
						if (data.includes('first\n')) {
							await setTimeout(1000);
							fixture.writeFile('value.ts', 'export const value = "second";');
							return true;
						}
					},
					(data) => {
						output += data;
						return data.includes('[tsx] change in ./value.ts Rerunning...\n');
					},
					(data) => {
						output += data;
						return data.includes('second\n');
					},
				],
				10_000,
			);

			tsxProcess.kill();
			await tsxProcess;

			expect(output).toContain('first\n');
			expect(output).toContain('[tsx] change in ./value.ts Rerunning...\n');
			expect(output).toContain('second\n');
		}, 12_000);

		test('CLI runs without warnings', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'module' }),
				'index.ts': 'console.log("loaded" as string)',
			});

			const { exitCode, stderr, stdout } = await node.tsx(['index.ts'], {
				cwd: fixture.path,
				env: {
					NODE_OPTIONS: '--throw-deprecation',
				},
			});
			expect(exitCode).toBe(0);
			expect(stderr).toBe('');
			expect(stdout).toBe('loaded');
		});

		test('ESM loader avoids module.register deprecation', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'module' }),
				'index.ts': 'console.log("loaded" as string)',
			});

			const { exitCode, stderr, stdout } = await execaNode(fixture.getPath('index.ts'), {
				nodePath: node.path,
				nodeOptions: ['--throw-deprecation', '--import', tsxEsmPath],
				reject: false,
			});
			expect(exitCode).toBe(0);
			expect(stderr).not.toContain('DEP0205');
			expect(stdout).toBe('loaded');
		});

		test('register API avoids module.register deprecation', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'module' }),
				'register.mjs': `
					import { register } from ${JSON.stringify(tsxEsmApiPath)};

					const unregister = register();
					const { message } = await import('./file');
					console.log(message);
					await unregister();
					`,
				'file.ts': 'export const message = "loaded" as string;',
			});

			const { exitCode, stderr, stdout } = await execaNode(fixture.getPath('register.mjs'), [], {
				nodePath: node.path,
				nodeOptions: ['--throw-deprecation'],
				reject: false,
			});
			expect(exitCode).toBe(0);
			expect(stderr).not.toContain('DEP0205');
			expect(stdout).toBe('loaded');
		});
	}

	test('CJS namespace import shape depends on Node version', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'index.ts': `
				import * as pkgCommonjs from 'pkg-commonjs';
				console.log(JSON.stringify(pkgCommonjs));
				`,
			node_modules: {
				'pkg-commonjs': {
					'package.json': createPackageJson({
						type: 'commonjs',
						main: './index.js',
					}),
					'index.js': `
						export const named = 2;
						export default 1;
						`,
				},
			},
		});

		const tsxProcess = await node.tsx(['index.ts'], fixture.path);

		expect(tsxProcess.failed).toBe(false);
		const namespace = JSON.parse(tsxProcess.stdout);
		if (node.supports.moduleRegisterHooksCjsReload) {
			expect(namespace).toEqual({
				default: {
					default: 1,
					named: 2,
				},
				'module.exports': {
					default: 1,
					named: 2,
				},
				named: 2,
			});
		} else if (node.supports.cjsNamespaceModuleExports) {
			expect(namespace).toEqual({
				default: {
					default: 1,
					named: 2,
				},
				'module.exports': {
					default: 1,
					named: 2,
				},
			});
		} else if (node.supports.cjsInterop) {
			expect(namespace).toEqual({
				default: {
					default: 1,
					named: 2,
				},
				named: 2,
			});
		} else {
			expect(namespace).toEqual({
				default: {
					default: 1,
					named: 2,
				},
			});
		}
		expect(tsxProcess.stderr).toBe('');
	});

	test('import.meta path properties follow Node file module support', async () => {
		await using fixture = await createFixture({
			'direct.js': `
				console.log(JSON.stringify({
					dirname: import.meta.dirname,
					filename: import.meta.filename,
					ownsDirname: Object.hasOwn(import.meta, 'dirname'),
					ownsFilename: Object.hasOwn(import.meta, 'filename'),
					ownsUrl: Object.hasOwn(import.meta, 'url'),
					url: import.meta.url,
				}));
				`,
			'require.cjs': 'require("./required.js");',
			'required.js': `
				console.log(JSON.stringify({
					dirname: import.meta.dirname,
					filename: import.meta.filename,
					ownsDirname: Object.hasOwn(import.meta, 'dirname'),
					ownsFilename: Object.hasOwn(import.meta, 'filename'),
					ownsUrl: Object.hasOwn(import.meta, 'url'),
					url: import.meta.url,
				}));
				export const loaded = true;
				`,
		});

		const directProcess = await node.tsx(['direct.js'], fixture.path);
		expect(directProcess.failed).toBe(false);
		expect(directProcess.stderr).toBe('');
		const directFilePath = fixture.getPath('direct.js');
		if (node.supports.importMetaPathProperties) {
			expect(JSON.parse(directProcess.stdout)).toEqual({
				dirname: path.dirname(directFilePath),
				filename: directFilePath,
				ownsDirname: true,
				ownsFilename: true,
				ownsUrl: true,
				url: pathToFileURL(directFilePath).toString(),
			});
		} else {
			expect(JSON.parse(directProcess.stdout)).toEqual({
				ownsDirname: false,
				ownsFilename: false,
				ownsUrl: true,
				url: pathToFileURL(directFilePath).toString(),
			});
		}

		const requireProcess = await node.tsx(['require.cjs'], fixture.path);
		expect(requireProcess.failed).toBe(false);
		expect(requireProcess.stderr).toBe('');
		const requiredFilePath = fixture.getPath('required.js');
		if (node.supports.importMetaPathProperties) {
			expect(JSON.parse(requireProcess.stdout)).toEqual({
				dirname: path.dirname(requiredFilePath),
				filename: requiredFilePath,
				ownsDirname: true,
				ownsFilename: true,
				ownsUrl: true,
				url: pathToFileURL(requiredFilePath).toString(),
			});
		} else {
			expect(JSON.parse(requireProcess.stdout)).toEqual({
				ownsDirname: false,
				ownsFilename: false,
				ownsUrl: true,
				url: pathToFileURL(requiredFilePath).toString(),
			});
		}
	});

	test('require(esm) support controls extensionless .mjs resolution', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'commonjs' }),
			'index.ts': `
				const read = (specifier) => {
					try {
						return require(specifier).default;
					} catch (error) {
						return error.code;
					}
				};

				console.log(JSON.stringify({
					index: read('./mjs/index'),
					directory: read('./mjs/'),
				}));
				`,
			mjs: {
				'index.mjs': 'export default 1;',
			},
		});

		const tsxProcess = await node.tsx(['index.ts'], fixture.path);

		expect(tsxProcess.failed).toBe(false);
		if (node.supports.requireEsmExtensionlessMjs) {
			expect(tsxProcess.stdout).toBe('{"index":1,"directory":1}');
		} else {
			expect(tsxProcess.stdout).toBe('{"index":"MODULE_NOT_FOUND","directory":"MODULE_NOT_FOUND"}');
		}
		expect(tsxProcess.stderr).toBe('');
	});

	test('module package main resolution keeps the Node 18 behavior boundary', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'index.ts': `
				import A from 'pkg';
				console.log(
					(typeof A === 'object' && A && 'default' in A)
						? A.default
						: A,
				);
				`,
			'node_modules/pkg': {
				'package.json': createPackageJson({
					name: 'pkg',
					main: './test.js',
				}),
				'test.ts': 'export default 1',
			},
		});

		const tsxProcess = await node.tsx(['index.ts'], {
			cwd: fixture.path,
		});

		if (!node.supports.modulePackageMainResolution) {
			expect(tsxProcess.failed).toBe(true);
			expect(tsxProcess.all).toContain('ERR_INTERNAL_ASSERTION');
			return;
		}

		expect(tsxProcess.failed).toBe(false);
		expect(tsxProcess.stdout).toBe('1');
		expect(tsxProcess.stderr).toBe('');
	});

	if (
		node.supports.cliTestFlag

		// node --test is broken in v20.0.0
		// https://github.com/nodejs/node/issues/48467
		&& node.version !== '20.0.0'
	) {
		test('Node.js test runner', async () => {
			await using fixture = await createFixture({
				'test.ts': `
					import { test } from 'node:test';
					import assert from 'assert';

					test('some passing test', () => {
						assert.strictEqual(1, 1 as number);
					});
					`,
			});

			const tsxProcess = await node.tsx(
				[
					'--test',
					...(
						node.supports.testRunnerGlob
							? []
							: ['test.ts']
					),
				],
				fixture.path,
			);

			if (node.supports.testRunnerGlob) {
				expect(tsxProcess.stdout).toMatch(/some passing test( \(.+ms\))?\n/);
			} else {
				expect(tsxProcess.stdout).toMatch('# pass 1\n');
			}
			expect(tsxProcess.exitCode).toBe(0);
		}, 10_000);
	}
});
