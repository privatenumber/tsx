import { pathToFileURL } from 'node:url';
import {
	describe, test, onFinish, expect,
} from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';
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

		test('passes transformed source to chained loaders', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'module' }),
				'entry.ts': `
					import { test } from './another.ts';

					console.log(test('ok'));
					`,
				'another.ts': `
					export function test(input: string) {
						return input;
					}
					`,
				'inspect-loader.mjs': `
					export const load = async (url, context, nextLoad) => {
						const result = await nextLoad(url, context);

						if (url.endsWith('/another.ts') && String(result.source).includes(': string')) {
							throw new Error('loader received untransformed TypeScript');
						}

						return result;
					};
					`,
			});

			const result = await node.tsx(
				[
					'--loader',
					pathToFileURL(fixture.getPath('inspect-loader.mjs')).toString(),
					'./entry.ts',
				],
				fixture.path,
			);

			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBe('ok');
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
