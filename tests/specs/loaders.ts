import { pathToFileURL } from 'node:url';
import {
	describe, test, onFinish, expect,
} from 'manten';
import { execaNode } from 'execa';
import { createFixture } from 'fs-fixture';
import { tsxEsmPath, type NodeApis } from '../utils/tsx.js';
import { createPackageJson } from '../fixtures.js';

export const loaders = (node: NodeApis) => describe('Loaders', () => {
	describe('Hooks', async () => {
		const fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),

			'ts.ts': `
			import fs from 'node:fs';

			export const tsLoaded = Boolean(fs);
			`,
			'mts.mts': `
			import fs from 'node:fs';

			export const mtsLoaded = Boolean(fs);
			export const mtsImportMetaUrl = import.meta.url;
			`,
			'runner.mts': `
			import { tsLoaded } from './ts.ts';
			import { mtsLoaded, mtsImportMetaUrl } from './mts.mts';

			console.log(JSON.stringify({
				mts: {
					importMetaUrl: mtsImportMetaUrl,
					loaded: mtsLoaded,
				},
				ts: {
					loaded: tsLoaded,
				},
			}));
			`,
		});
		onFinish(async () => await fixture.rm());

		test('.ts and .mts', async () => {
			const tsxResult = await node.hook(['./runner.mts'], fixture.path);

			expect(tsxResult.stderr).toBe('');
			expect(tsxResult.exitCode).toBe(0);

			const loaderHooksResult = JSON.parse(tsxResult.stdout);

			expect(loaderHooksResult).toEqual({
				mts: {
					importMetaUrl: pathToFileURL(fixture.getPath('mts.mts')).toString(),
					loaded: true,
				},
				ts: {
					loaded: true,
				},
			});
		});
	});

	describe('Chained hooks', async () => {
		// A hook registered via module.register() after tsx must get tsx's
		// TypeScript resolution through nextResolve(). Node does not chain
		// downstream async hooks through sync registerHooks(), so tsx
		// registers an async copy of its hooks for chaining.
		// https://github.com/privatenumber/tsx/issues/853
		const fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),

			'main.ts': `
			import { greet } from './lib.js';

			console.log(greet());
			`,
			'lib.ts': `
			export const greet = (): string => 'hello';
			`,
			'hook.mjs': `
			export async function resolve(specifier, context, nextResolve) {
				const result = await nextResolve(specifier, context);

				if (result.url.endsWith('/main.ts')) {
					// The same resolution Node performs for \`import './lib.js'\`
					// inside main.ts, but through this downstream hook's
					// nextResolve().
					const lib = await nextResolve('./lib.js', {
						...context,
						parentURL: result.url,
					});
					console.log('HOOK_RESOLVED:' + lib.url.split('/').pop());
				}

				return result;
			}
			`,
			'register.mjs': `
			import { register } from 'node:module';

			register('./hook.mjs', import.meta.url);
			`,
		});
		onFinish(async () => await fixture.rm());

		test('downstream async hook resolves .js to .ts via nextResolve', async () => {
			const result = await execaNode(
				fixture.getPath('main.ts'),
				[],
				{
					cwd: fixture.path,
					nodePath: node.path,
					nodeOptions: ['--import', tsxEsmPath, '--import', './register.mjs'],
					reject: false,
				},
			);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toContain('hello');
			expect(result.stdout).toContain('HOOK_RESOLVED:lib.ts');
		});
	});

	describe('CJS patching', async () => {
		const fixture = await createFixture({
			'package.json': createPackageJson({ type: 'commonjs' }),

			'ts.ts': `
			import fs from 'node:fs';

			console.log(Boolean(fs) as unknown as string);
			`,
			'cts.cts': `
			import fs from 'node:fs';

			console.log(Boolean(fs) as unknown as string);
			`,
			'mts.mts': `
			import fs from 'node:fs';

			console.log(Boolean(fs) as unknown as string, import.meta.url);
			`,
		});
		onFinish(async () => await fixture.rm());

		test('.ts', async () => {
			const tsxResult = await node.cjsPatched(['./ts.ts'], fixture.path);

			expect(tsxResult.stdout).toBe('true');
			expect(tsxResult.stderr).toBe('');
			expect(tsxResult.exitCode).toBe(0);
		});

		// TODO: Investigate why this works -- it shouldnt
		// test('should not be able to load .mjs', async () => {
		// 	const tsxResult = await node.cjsPatched(['./mts.mts'], fixture.path);

		// 	expect(tsxResult.stdout).toBe('true');
		// 	expect(tsxResult.stderr).toBe('');
		// 	expect(tsxResult.exitCode).toBe(0);
		// });
	});
});
