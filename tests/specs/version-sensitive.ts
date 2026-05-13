import { describe, test, expect } from 'manten';
import { execaNode } from 'execa';
import { createFixture } from 'fs-fixture';
import { tsxEsmApiPath, tsxEsmPath, type NodeApis } from '../utils/tsx';
import { createPackageJson } from '../fixtures';

// Lightweight tests for behaviors that vary across Node versions.
// Run on every Node version in the CI matrix.
export const versionSensitiveTests = (node: NodeApis) => describe('Version-sensitive', () => {
	if (node.supports.moduleRegisterHooksCjsReload) {
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
