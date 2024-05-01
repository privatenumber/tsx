import path from 'node:path';
import { execaNode } from 'execa';
import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import {
	tsxEsmPath, tsxCjsApiPath, type NodeApis, tsxCjsPath,
} from '../utils/tsx.js';

const tsFiles = {
	'file.ts': `
	import { foo } from './foo'
	export const message = foo as string
	`,
	'foo.ts': `
	import { bar } from './bar.js'
	export const foo = \`foo \${bar}\` as string
	`,
	'bar.ts': 'export const bar = "bar" as string',
};

export default testSuite(({ describe }, node: NodeApis) => {
	describe('API', ({ describe }) => {
		describe('CommonJS', ({ test }) => {
			test('cli', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'index.ts': 'import { message } from \'./file\';\n\nconsole.log(message, new Error().stack);',
					...tsFiles,
				});
				onTestFinish(async () => await fixture.rm());

				const { stdout } = await execaNode(path.join(fixture.path, 'index.ts'), {
					nodePath: node.path,
					nodeOptions: ['--require', tsxCjsPath],
				});
				expect(stdout).toContain('foo bar');
				expect(stdout).toContain('index.ts:3:22');
			});

			test('register / unregister', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'register.cjs': `
					const { register } = require(${JSON.stringify(tsxCjsApiPath)});
					try {
						require('./file');
					} catch {
						console.log('Fails as expected');
					}

					const unregister = register();

					const loaded = require('./file');
					console.log(loaded.message);

					// Remove from cache
					const loadedPath = require.resolve('./file');
					delete require.cache[loadedPath];

					unregister();

					try {
						require('./file');
					} catch {
						console.log('Unregistered');
					}
					`,
					...tsFiles,
				});
				onTestFinish(async () => await fixture.rm());

				const { stdout } = await execaNode(path.join(fixture.path, 'register.cjs'), [], {
					nodePath: node.path,
					nodeOptions: [],
				});

				expect(stdout).toBe('Fails as expected\nfoo bar\nUnregistered');
			});

			describe('tsx.require()', ({ test }) => {
				test('loads', async ({ onTestFinish }) => {
					const fixture = await createFixture({
						'require.cjs': `
						const tsx = require(${JSON.stringify(tsxCjsApiPath)});
						try {
							require('./file');
						} catch {
							console.log('Fails as expected');
						}

						const loaded = tsx.require('./file', __filename);
						console.log(loaded.message);

						// Remove from cache
						const loadedPath = tsx.require.resolve('./file', __filename);
						delete require.cache[loadedPath];

						try {
							require('./file');
						} catch {
							console.log('Unpolluted global require');
						}
						`,
						...tsFiles,
					});
					onTestFinish(async () => await fixture.rm());

					const { stdout } = await execaNode(path.join(fixture.path, 'require.cjs'), [], {
						nodePath: node.path,
						nodeOptions: [],
					});

					expect(stdout).toBe('Fails as expected\nfoo bar\nUnpolluted global require');
				});

				test('catchable', async ({ onTestFinish }) => {
					const fixture = await createFixture({
						'require.cjs': `
						const tsx = require(${JSON.stringify(tsxCjsApiPath)});
						try { tsx.require('./file', __filename); } catch {}
						`,
						'file.ts': 'if',
					});
					onTestFinish(async () => await fixture.rm());

					const { all } = await execaNode(path.join(fixture.path, 'require.cjs'), [], {
						nodePath: node.path,
						nodeOptions: [],
						all: true,
					});
					expect(all).toBe('');
				});
			});
		});

		describe('node:module', ({ test }) => {
			test('cli', async ({ onTestFinish }) => {
				const fixture = await createFixture({
					'package.json': JSON.stringify({ type: 'node:module' }),
					'index.ts': 'import { message } from \'./file\';\n\nconsole.log(message, new Error().stack);',
					...tsFiles,
				});
				onTestFinish(async () => await fixture.rm());

				const { stdout } = await execaNode(path.join(fixture.path, 'index.ts'), {
					nodePath: node.path,
					nodeOptions: [node.supports.moduleRegister ? '--import' : '--loader', tsxEsmPath],
				});
				expect(stdout).toContain('foo bar');
				expect(stdout).toContain('index.ts:3:22');
			});

			if (node.supports.moduleRegister) {
				test('module.register', async ({ onTestFinish }) => {
					const fixture = await createFixture({
						'package.json': JSON.stringify({ type: 'node:module' }),
						'module-register.mjs': `
						import { register } from 'node:module';

						await import('./file.ts').catch((error) => {
							console.log('Fails as expected');
						});

						register(${JSON.stringify(tsxEsmPath)}, {
							parentURL: import.meta.url,
							data: true,
						})

						const { message } = await import('./file.ts?nocache')
						console.log(message)
						`,
						...tsFiles,
					});
					onTestFinish(async () => await fixture.rm());

					const { stdout } = await execaNode(path.join(fixture.path, 'module-register.mjs'), [], {
						nodePath: node.path,
						nodeOptions: [],
					});

					expect(stdout).toBe('Fails as expected\nfoo bar');
				});
			}
		});
	});
});
