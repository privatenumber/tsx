import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import {
	describe, test, expect, skip,
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

		test('runs when a TypeScript pre-import registers an async loader', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'module' }),
				'hook.ts': `
					import { register } from 'node:module';

					register('fixture-loader/hook.mjs', import.meta.url);
					`,
				// enum forces tsx to actually transform the entrypoint; Node native
				// type-stripping rejects it, so the assertion proves the loader ran.
				'main.ts': 'enum Mode { Run = "run" } console.log("entrypoint:" + Mode.Run);',
				'node_modules/fixture-loader/hook.mjs': `
					export const resolve = async (specifier, context, nextResolve) => (
						nextResolve(specifier, context)
					);
					`,
			});

			const { exitCode, stdout } = await node.tsx(['main.ts'], {
				cwd: fixture.path,
				env: {
					NODE_OPTIONS: `--import ${pathToFileURL(fixture.getPath('hook.ts')).toString()}`,
				},
			});

			expect(exitCode).toBe(0);
			expect(stdout).toBe('entrypoint:run');
		});

		test('runs when a direct TypeScript pre-import registers an async loader', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'module' }),
				// .mts hook exercises the non-.ts branch of isTypeScriptImport,
				// and the --import=<specifier> form below exercises the equals-form
				// branch of collectImportSpecifiers.
				'hook.mts': `
					import { register } from 'node:module';

					register('fixture-loader/hook.mjs', import.meta.url);
					`,
				'main.ts': 'enum Mode { Run = "run" } console.log("entrypoint:" + Mode.Run);',
				'node_modules/fixture-loader/hook.mjs': `
					export const resolve = async (specifier, context, nextResolve) => (
						nextResolve(specifier, context)
					);
					`,
			});

			const process = await execaNode('main.ts', {
				cwd: fixture.path,
				nodePath: node.path,
				nodeOptions: [
					'--import=./hook.mts',
					'--import',
					tsxEsmPath,
				],
				reject: false,
			});

			expect(process.exitCode).toBe(0);
			expect(process.stdout).toBe('entrypoint:run');
		});

		test('runs when a direct TypeScript pre-import precedes tsx as an absolute path', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'module' }),
				'hook.ts': `
					import { register } from 'node:module';

					register('fixture-loader/hook.mjs', import.meta.url);
					`,
				// enum forces tsx to actually transform the entrypoint; Node native
				// type-stripping rejects it, so the assertion proves the loader ran.
				'main.ts': 'enum Mode { Run = "run" } console.log("entrypoint:" + Mode.Run);',
				'node_modules/fixture-loader/hook.mjs': `
					export const resolve = async (specifier, context, nextResolve) => (
						nextResolve(specifier, context)
					);
					`,
			});

			const process = await execaNode('main.ts', {
				cwd: fixture.path,
				nodePath: node.path,
				nodeOptions: [
					'--import',
					'./hook.ts',
					'--import',
					decodeURI(new URL(tsxEsmPath).pathname),
				],
				reject: false,
			});

			expect(process.exitCode).toBe(0);
			expect(process.stdout).toBe('entrypoint:run');
		});

		test('dynamic TypeScript import evaluates with an async loader hook', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'module' }),
				'async-hooks.mjs': `
					export const resolve = async (specifier, context, nextResolve) => (
						nextResolve(specifier, context)
					);

					export const load = async (url, context, nextLoad) => (
						nextLoad(url, context)
					);
					`,
				'entry.ts': `
					import { register } from 'node:module';

					register('./async-hooks.mjs', import.meta.url);

					const imported = await import('./sibling.ts');

					console.log(JSON.stringify({
						keys: Object.keys(imported),
						value: imported.value,
					}));
					`,
				'sibling.ts': `
					console.log('sibling evaluated');

					export const value = 'loaded';
					`,
			});

			const process = await execaNode('entry.ts', {
				cwd: fixture.path,
				nodePath: node.path,
				nodeOptions: [
					'--import',
					tsxEsmPath,
				],
				reject: false,
			});

			expect(process.exitCode).toBe(0);
			expect(process.stdout.split('\n')).toEqual([
				'sibling evaluated',
				JSON.stringify({
					keys: ['value'],
					value: 'loaded',
				}),
			]);
		});

		test('sync ESM hook preserves CJS JSON require', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'entry.cjs': 'require("fake-mocha/lib/mocha.js");',
				'node_modules/fake-mocha': {
					'package.json': createPackageJson({ type: 'commonjs' }),
					lib: {
						'mocha.js': `
							const mocharc = require("./mocharc.json");

							console.log(JSON.stringify(mocharc));
							`,
						'mocharc.json': JSON.stringify({
							diff: true,
							extension: ['js', 'cjs', 'mjs'],
						}),
					},
				},
			});

			const process = await node.hook(['entry.cjs'], fixture.path);

			expect(process.exitCode).toBe(0);
			expect(process.stderr).toBe('');
			expect(JSON.parse(process.stdout)).toEqual({
				diff: true,
				extension: ['js', 'cjs', 'mjs'],
			});
		});

		// https://github.com/privatenumber/tsx/issues/800
		test('sync ESM hook resolves directory requires inside dependencies', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'entry.cjs': 'console.log(JSON.stringify(require("dep")));',
				node_modules: {
					// Bare dependency required with a trailing slash, like
					// readable-stream's `require('process/')`. The trailing slash
					// must not be treated as a relative directory.
					'bare-dep': {
						'package.json': createPackageJson({
							type: 'commonjs',
							main: './index.js',
						}),
						'index.js': 'module.exports = "bare-ok";',
					},
					dep: {
						'package.json': createPackageJson({
							type: 'commonjs',
							main: './lib/sub/entry.js',
						}),
						lib: {
							// `require('..')` from the nested entry resolves here.
							'index.js': 'module.exports = { parent: "parent-ok" };',
							sub: {
								'entry.js': `
									const parent = require('..');
									const bare = require('bare-dep/');
									module.exports = { parent: parent.parent, bare };
									`,
							},
						},
					},
				},
			});

			const process = await node.hook(['entry.cjs'], fixture.path);

			expect(process.stderr).toBe('');
			expect(process.exitCode).toBe(0);
			expect(JSON.parse(process.stdout)).toEqual({
				parent: 'parent-ok',
				bare: 'bare-ok',
			});
		});

		// https://github.com/privatenumber/tsx/issues/800
		test('sync ESM hook resolves a dependency directory require to a TypeScript index', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'entry.cjs': 'console.log(require("ts-dep").tag);',
				'node_modules/ts-dep': {
					'package.json': createPackageJson({
						type: 'commonjs',
						main: './lib/sub/entry.js',
					}),
					lib: {
						// TypeScript directory index, with no index.js sibling: the
						// type annotation proves it is transformed, not found as JS.
						'index.ts': 'export const tag: string = "ts-index";',
						sub: {
							'entry.js': 'module.exports = require("..");',
						},
					},
				},
			});

			const process = await node.hook(['entry.cjs'], fixture.path);

			expect(process.stderr).toBe('');
			expect(process.exitCode).toBe(0);
			expect(process.stdout).toBe('ts-index');
		});

		// https://github.com/privatenumber/tsx/issues/800
		test('sync ESM hook resolves a dependency directory require via package.json "main"', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'entry.cjs': 'console.log(require("main-dep").from);',
				'node_modules/main-dep': {
					'package.json': createPackageJson({
						type: 'commonjs',
						main: './lib/sub/entry.js',
					}),
					lib: {
						// Nested package.json "main" with no index file: require('..')
						// must fall back to it rather than a synthesized index.
						'package.json': createPackageJson({ main: './real-main.js' }),
						'real-main.js': 'module.exports = { from: "real-main" };',
						sub: {
							'entry.js': 'module.exports = require("..");',
						},
					},
				},
			});

			const process = await node.hook(['entry.cjs'], fixture.path);

			expect(process.stderr).toBe('');
			expect(process.exitCode).toBe(0);
			expect(process.stdout).toBe('real-main');
		});

		// https://github.com/privatenumber/tsx/issues/800
		test('sync ESM hook resolves a trailing-slash package require to a TypeScript main', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'entry.cjs': 'console.log(require("driver-dep").v);',
				node_modules: {
					'driver-dep': {
						'package.json': createPackageJson({
							type: 'commonjs',
							main: './entry.js',
						}),
						// Trailing-slash require of a package whose main is TS-only:
						// must still retry TypeScript extensions on the package main.
						'entry.js': 'module.exports = require("ts-main-pkg/");',
					},
					'ts-main-pkg': {
						'package.json': createPackageJson({
							type: 'commonjs',
							main: './main.js',
						}),
						'main.ts': 'export const v: string = "ts-main";',
					},
				},
			});

			const process = await node.hook(['entry.cjs'], fixture.path);

			expect(process.stderr).toBe('');
			expect(process.exitCode).toBe(0);
			expect(process.stdout).toBe('ts-main');
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
					async ({ output: stdout }) => {
						output = stdout;
						if (output.includes('first')) {
							await setTimeout(1000);
							await fixture.writeFile('value.ts', 'export const value = "second";');
							return true;
						}
					},
					({ output: stdout }) => {
						output = stdout;
						return output.includes('[tsx] change in ./value.ts Rerunning...');
					},
					({ output: stdout }) => {
						output = stdout;
						return output.includes('second');
					},
				],
				10_000,
			);

			tsxProcess.kill();
			await tsxProcess;

			expect(output).toContain('first');
			expect(output).toContain('[tsx] change in ./value.ts Rerunning...');
			expect(output).toContain('second');
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

	test('ESM imports preserve CommonJS-classified TypeScript contracts', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'commonjs' }),
			'runner.mts': `
				console.log(JSON.stringify({
					static: (await import('./named/static.mts')).default,
					staticCts: ${node.supports.cjsInterop ? "(await import('./cts/static-cts.mts')).default" : 'null'},
					staticNamespace: (await import('./namespace/static-namespace.mts')).default,
					staticNamespaceRequire: (await import('./namespace-require/static-namespace-require.mts')).default,
					dynamicBeforeStatic: (await import('./order/dynamic-before-static.mts')).default,
					staticRequire: (await import('./require/static-require.mts')).default,
					dynamic: (await import('./dynamic/dynamic.mts')).default,
					dynamicRequire: (await import('./dynamic-require/dynamic-require.mts')).default,
					defaultImportKeepsCjsGlobals: (await import('./default-cjs-global/import.mts')).default,
					commentedNamedBindings: (await import('./commented/import.mjs')).default,
					queryIdentity: (await import('./query/import.mts')).default,
				}));
				`,
			'named/config.ts': `
				import { suffix } from './suffix.ts';

				export const metaUrl = import.meta.url;
				export function defineConfig(value: string) {
					return \`\${value}:\${suffix}\`;
				}
				export default { defineConfig };
				`,
			'named/suffix.ts': 'export const suffix = "suffix";',
			'named/static.mts': `
				import { defineConfig, metaUrl } from './config';

				export default {
					metaUrl,
					namedResult: defineConfig('static'),
					namedType: typeof defineConfig,
				};
				`,
			'cts/config.cts': `
				export const value = "cts-named";
				export default { value };
				`,
			'cts/static-cts.mts': `
				import { value } from './config.cts';

				export default value;
				`,
			'namespace/config.ts': `
				import { suffix } from './suffix.ts';

				export const metaUrl = import.meta.url;
				export function defineConfig(value: string) {
					return \`\${value}:\${suffix}\`;
				}
				export default { defineConfig };
				`,
			'namespace/suffix.ts': 'export const suffix = "suffix";',
			'namespace/static-namespace.mts': `
				import * as config from './config.ts';

				export default {
					defaultResult: config.default.defineConfig('static-namespace-default'),
					hasNamed: Object.hasOwn(config, 'defineConfig'),
					metaUrl: config.metaUrl,
					namedResult: config.defineConfig?.('static-namespace-named') ?? null,
					namedType: typeof config.defineConfig,
				};
				`,
			'namespace-require/path.ts': `
				export const sep = require("node:path").sep;
				export default { sep };
				`,
			'namespace-require/static-namespace-require.mts': `
				import * as path from './path.ts';

				export default path.default.sep;
				`,
			'order/config.ts': `
				import { suffix } from './suffix.ts';

				export const metaUrl = import.meta.url;
				export function defineConfig(value: string) {
					return \`\${value}:\${suffix}\`;
				}
				export default { defineConfig };
				`,
			'order/suffix.ts': 'export const suffix = "suffix";',
			'order/static-after-dynamic.mts': `
				import { defineConfig } from './config.ts';

				export default defineConfig('static-after-dynamic');
				`,
			'order/dynamic-before-static.mts': `
				const namespace = await import('./config.ts');
				const staticAfterDynamic = await import('./static-after-dynamic.mts');

				export default [
					namespace.defineConfig?.('dynamic-before-static') ?? null,
					staticAfterDynamic.default,
				];
				`,
			'require/config-require.ts': `
				export const sep = require("node:path").sep;
				export default { sep };
				`,
			'require/static-require.mts': `
				import configDefault from './config-require.ts';
				import * as configNamespace from './config-require.ts';

				export default [
					configDefault.sep,
					configNamespace.default.sep,
				];
				`,
			'dynamic/config.ts': `
				import { suffix } from './suffix.ts';

				export const metaUrl = import.meta.url;
				export function defineConfig(value: string) {
					return \`\${value}:\${suffix}\`;
				}
				export default { defineConfig };
				`,
			'dynamic/suffix.ts': 'export const suffix = "suffix";',
			'dynamic/dynamic.mts': `
				const namespace = await import('./config.ts');

				export default {
					defaultResult: namespace.default.defineConfig('dynamic-default'),
					hasNamed: Object.hasOwn(namespace, 'defineConfig'),
					metaUrl: namespace.metaUrl,
					namedResult: namespace.defineConfig?.('dynamic-named') ?? null,
					namedType: typeof namespace.defineConfig,
				};
				`,
			'dynamic-require/config-require.ts': `
				export const sep = require("node:path").sep;
				export default { sep };
				`,
			'dynamic-require/dynamic-require.mts': `
				const namespace = await import('./config-require.ts');

				export default namespace.default.sep;
				`,
			'default-cjs-global/config.ts': `
				if (!require.cache) {
					throw new Error("require.cache should be defined");
				}

				module.exports = {
					cacheDefined: true,
				};
				`,
			'default-cjs-global/import.mts': `
				import config from './config.ts?x=1';

				export default config;
				`,
			'commented/config.ts': `
				export const sep = require("node:path").sep;
				export default { sep };
				`,
			'commented/import.mjs': `
				import /* { sep } */ config from './config.ts';

				export default config.sep;
				`,
			'query/config.ts': `
				globalThis.__tsxQueryLoadCount = (globalThis.__tsxQueryLoadCount ?? 0) + 1;

				export const count = globalThis.__tsxQueryLoadCount;
				export const url = import.meta.url;
				export default { count, url };
				`,
			'query/import.mts': `
				import { count as firstCount, url as firstUrl } from './config.ts?x=1';
				import { count as secondCount, url as secondUrl } from './config.ts?x=2';
				import { count as firstAgainCount, url as firstAgainUrl } from './config.ts?x=1';

				export default {
					first: {
						count: firstCount,
						url: firstUrl,
					},
					second: {
						count: secondCount,
						url: secondUrl,
					},
					firstAgain: {
						count: firstAgainCount,
						url: firstAgainUrl,
					},
				};
				`,
		});

		const process = await node.tsx(['runner.mts'], fixture.path);
		expect(process.failed).toBe(false);
		expect(process.stderr).toBe('');
		expect(JSON.parse(process.stdout)).toEqual({
			static: {
				metaUrl: pathToFileURL(fixture.getPath('named/config.ts')).toString(),
				namedResult: 'static:suffix',
				namedType: 'function',
			},
			staticCts: node.supports.cjsInterop ? 'cts-named' : null,
			staticNamespace: (
				node.supports.esmLoadReadFile
					? {
						defaultResult: 'static-namespace-default:suffix',
						hasNamed: true,
						metaUrl: pathToFileURL(fixture.getPath('namespace/config.ts')).toString(),
						namedResult: 'static-namespace-named:suffix',
						namedType: 'function',
					}
					: {
						defaultResult: 'static-namespace-default:suffix',
						hasNamed: false,
						namedResult: null,
						namedType: 'undefined',
					}
			),
			staticNamespaceRequire: path.sep,
			dynamicBeforeStatic: [
				'dynamic-before-static:suffix',
				'static-after-dynamic:suffix',
			],
			staticRequire: [
				path.sep,
				path.sep,
			],
			dynamic: {
				defaultResult: 'dynamic-default:suffix',
				hasNamed: true,
				metaUrl: pathToFileURL(fixture.getPath('dynamic/config.ts')).toString(),
				namedResult: 'dynamic-named:suffix',
				namedType: 'function',
			},
			dynamicRequire: path.sep,
			defaultImportKeepsCjsGlobals: {
				cacheDefined: true,
			},
			commentedNamedBindings: path.sep,
			queryIdentity: {
				first: {
					count: 1,
					url: `${pathToFileURL(fixture.getPath('query/config.ts'))}?x=1`,
				},
				second: {
					count: 2,
					url: `${pathToFileURL(fixture.getPath('query/config.ts'))}?x=2`,
				},
				firstAgain: {
					count: 1,
					url: `${pathToFileURL(fixture.getPath('query/config.ts'))}?x=1`,
				},
			},
		});
	});

	test('TypeScript import paths preserve literal question marks', async () => {
		if (process.platform === 'win32') {
			skip('Windows paths cannot contain literal question marks');
		}

		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'import.mts': 'import "./file%3Fname.ts";',
			'file?name.ts': 'console.log("literal-question");',
		});

		const tsxProcess = await node.tsx(['import.mts'], fixture.path);

		expect(tsxProcess.failed).toBe(false);
		expect(tsxProcess.stderr).toBe('');
		expect(tsxProcess.stdout).toBe('literal-question');
	});

	test('tsImport keeps CommonJS-classified TypeScript namespace loads isolated', async () => {
		if (!node.supports.esmLoadReadFile) {
			return;
		}

		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'commonjs' }),
			'import.mjs': `
				import { setTimeout } from 'node:timers/promises';
				import { tsImport } from ${JSON.stringify(tsxEsmApiPath)};

				const first = await tsImport('./file.ts', import.meta.url);
				await setTimeout(1);
				const second = await tsImport('./file.ts', import.meta.url);
				const plainLoaded = await import('./file.ts').then(
					() => true,
					() => false,
				);

				console.log(JSON.stringify({
					first: {
						count: first.count,
						namespaced: first.url.includes('tsx-namespace='),
					},
					second: {
						count: second.count,
						namespaced: second.url.includes('tsx-namespace='),
					},
					plainLoaded,
				}));
				`,
			'file.ts': `
				globalThis.__tsxLoadCount = (globalThis.__tsxLoadCount ?? 0) + 1;

				export const count = globalThis.__tsxLoadCount;
				export const url = import.meta.url;
				export default { count, url };
				`,
		});

		const process = await execaNode(fixture.getPath('import.mjs'), [], {
			nodePath: node.path,
			nodeOptions: ['--no-warnings'],
			reject: false,
		});

		expect(process.exitCode).toBe(0);
		expect(process.stderr).toBe('');
		expect(JSON.parse(process.stdout)).toEqual({
			first: {
				count: 1,
				namespaced: true,
			},
			second: {
				count: 2,
				namespaced: true,
			},
			plainLoaded: false,
		});
	});

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
		const supportsTransformedCjsNamespace = (
			node.supports.cjsInterop
			&& node.supports.moduleRegisterHooksCjsReload
		);

		if (supportsTransformedCjsNamespace && node.supports.cjsNamespaceModuleExports) {
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
		} else if (supportsTransformedCjsNamespace) {
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

	if (node.supports.requireEsm) {
		test('require(esm) supports module.exports interop export', async () => {
			const jsModuleSource = (extension: string) => `
				const value = ${JSON.stringify(`module exports ${extension}`)};
				export { value as "module.exports" };
				export const named = ${JSON.stringify(`named ${extension}`)};
				export default ${JSON.stringify(`default ${extension}`)};
				`;
			const tsModuleSource = (extension: string) => `
				const value: string = ${JSON.stringify(`module exports ${extension}`)};
				export { value as "module.exports" };
				export const named = ${JSON.stringify(`named ${extension}`)};
				export default ${JSON.stringify(`default ${extension}`)};
				`;

			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'module' }),
				'load-js.cjs': `
					const load = async (extension) => {
						const required = require(\`./module.\${extension}\`);
						const imported = await import(\`./module.\${extension}\`);
						return {
							imported,
							required,
						};
					};

					(async () => {
						console.log(JSON.stringify({
							js: await load('js'),
							mjs: await load('mjs'),
						}));
					})();
					`,
				'load-all.cjs': `
					const load = async (extension) => {
						const required = require(\`./module.\${extension}\`);
						const imported = await import(\`./module.\${extension}\`);
						return {
							imported,
							required,
						};
					};

					(async () => {
						console.log(JSON.stringify({
							js: await load('js'),
							mjs: await load('mjs'),
							mts: await load('mts'),
							ts: await load('ts'),
						}));
					})();
					`,
				'load-cjs-style-typescript.cjs': `
					const required = require("./cjs-style.ts");

					console.log(JSON.stringify(required));
					`,
				'load-commonjs-package.cjs': `
					console.log(JSON.stringify({
						js: require("./commonjs/module.js"),
						ts: require("./commonjs/module.ts"),
					}));
					`,
				'module.mjs': jsModuleSource('mjs'),
				'module.js': jsModuleSource('js'),
				'module.mts': tsModuleSource('mts'),
				'module.ts': tsModuleSource('ts'),
				'commonjs/package.json': createPackageJson({ type: 'commonjs' }),
				'commonjs/module.js': jsModuleSource('commonjs js'),
				'commonjs/module.ts': tsModuleSource('commonjs ts'),
				'cjs-style.ts': `
					import path = require("node:path");

					module.exports = {
						"module.exports": path.basename(__filename),
						named: "named cjs-style ts",
					};
					`,
			});

			const nativeProcess = await execaNode(fixture.getPath('load-js.cjs'), [], {
				nodePath: node.path,
				nodeOptions: [],
				reject: false,
			});
			expect(nativeProcess.exitCode).toBe(0);
			if (node.supports.requireEsmNoWarning) {
				expect(nativeProcess.stderr).toBe('');
			} else {
				expect(nativeProcess.stderr).toContain('ExperimentalWarning');
				expect(nativeProcess.stderr).toContain('Support for loading ES Module in require()');
			}
			expect(JSON.parse(nativeProcess.stdout)).toEqual({
				js: {
					imported: {
						default: 'default js',
						'module.exports': 'module exports js',
						named: 'named js',
					},
					required: 'module exports js',
				},
				mjs: {
					imported: {
						default: 'default mjs',
						'module.exports': 'module exports mjs',
						named: 'named mjs',
					},
					required: 'module exports mjs',
				},
			});

			const tsxProcess = await node.tsx(['load-all.cjs'], fixture.path);
			expect(tsxProcess.exitCode).toBe(0);
			expect(tsxProcess.stderr).toBe('');
			expect(JSON.parse(tsxProcess.stdout)).toEqual({
				js: {
					imported: {
						default: 'default js',
						'module.exports': 'module exports js',
						named: 'named js',
					},
					required: 'module exports js',
				},
				mjs: {
					imported: {
						default: 'default mjs',
						'module.exports': 'module exports mjs',
						named: 'named mjs',
					},
					required: 'module exports mjs',
				},
				mts: {
					imported: {
						default: 'default mts',
						'module.exports': 'module exports mts',
						named: 'named mts',
					},
					required: 'module exports mts',
				},
				ts: {
					imported: {
						default: 'default ts',
						'module.exports': 'module exports ts',
						named: 'named ts',
					},
					required: 'module exports ts',
				},
			});

			const cjsStyleTypeScriptProcess = await node.tsx(['load-cjs-style-typescript.cjs'], fixture.path);
			expect(cjsStyleTypeScriptProcess.exitCode).toBe(0);
			expect(cjsStyleTypeScriptProcess.stderr).toBe('');
			expect(JSON.parse(cjsStyleTypeScriptProcess.stdout)).toEqual({
				'module.exports': 'cjs-style.ts',
				named: 'named cjs-style ts',
			});

			const commonjsPackageProcess = await node.tsx(['load-commonjs-package.cjs'], fixture.path);
			expect(commonjsPackageProcess.exitCode).toBe(0);
			expect(commonjsPackageProcess.stderr).toBe('');
			expect(JSON.parse(commonjsPackageProcess.stdout)).toEqual({
				js: {
					default: 'default commonjs js',
					'module.exports': 'module exports commonjs js',
					named: 'named commonjs js',
				},
				ts: {
					default: 'default commonjs ts',
					'module.exports': 'module exports commonjs ts',
					named: 'named commonjs ts',
				},
			});
		});
	}

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
