import type { ResolveHookContext } from 'node:module';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spyOn } from 'tinyspy';
import { createFixture } from 'fs-fixture';
import { describe, expect, test } from 'manten';
import { createData, createDefaultData, createInitialize } from '../../src/esm/hook/initialize.js';
import { createResolve, createResolveSync } from '../../src/esm/hook/resolve.js';
import { createLoad, createLoadSync } from '../../src/esm/hook/load.js';

const context: ResolveHookContext = {
	conditions: ['node', 'import'],
	importAttributes: {},
	parentURL: undefined,
};

// The resolver calls `fileURLToPath()` on the parent URL, which rejects
// drive-less file URLs on Windows. `pathToFileURL()` resolves the path
// absolutely, so Windows gets the drive letter it requires.
const entryFileUrl = pathToFileURL('/app/entry.ts').toString();
const moduleFileUrl = pathToFileURL('/app/module.ts').toString();

const createNamespaceContext = (
	namespace: string,
	conditions: string[] = ['node', 'import'],
): ResolveHookContext => ({
	conditions,
	importAttributes: {},
	parentURL: `${entryFileUrl}?tsx-namespace=${namespace}`,
});

export const esmHookResolve = () => describe('ESM resolve hook', async () => {
	await test('preserves the entry path in isolated registration data', async () => {
		const first = createDefaultData();
		await createInitialize(first)({
			entryPath: 'first.ts',
			tsconfig: false,
		});
		const second = createData({
			entryPath: 'second.ts',
			tsconfig: false,
		});
		const empty = createData({ tsconfig: false });
		expect(first.entryPath).toBe('first.ts');
		expect(second.entryPath).toBe('second.ts');
		expect(empty.entryPath).toBeUndefined();
	});

	for (const [name, createResolver] of [
		['async', createResolve],
		['sync', createResolveSync],
	] as const) {
		await test(`${name} recovers a TypeScript entry extension without changing its realpath`, async () => {
			await using fixture = await createFixture({
				'package.json': '{ "type": "module" }',
				'real/package.json': '{ "type": "commonjs" }',
				'real/entry.txt': '',
			});
			const entryPath = fixture.getPath('entry.ts');
			const targetPath = fixture.getPath('real/entry.txt');
			const targetUrl = pathToFileURL(targetPath).toString();
			const originalArgv = process.argv;
			const originalRealpath = fs.realpathSync;
			using realpath = spyOn(fs, 'realpathSync');
			realpath.willCall((filePath, ...options) => (
				filePath === entryPath ? targetPath : originalRealpath(filePath, ...options)
			));
			syncBuiltinESMExports();
			process.argv = [process.execPath];
			try {
				const resolve = createResolver(createData({
					entryPath,
					tsconfig: false,
				}));
				const resolution = {
					url: targetUrl,
					format: undefined,
				};
				expect(await resolve(targetUrl, context, () => resolution)).toStrictEqual({
					url: targetUrl,
					format: 'commonjs',
				});
				expect(resolution.format).toBeUndefined();
				expect(await resolve(targetUrl, {
					...context,
					parentURL: entryFileUrl,
				}, () => resolution)).toStrictEqual(resolution);
				expect(await resolve(targetUrl, context, () => ({
					url: targetUrl,
					format: 'json',
				}))).toStrictEqual({
					url: targetUrl,
					format: 'json',
				});
			} finally {
				process.argv = originalArgv;
				realpath.restore();
				syncBuiltinESMExports();
			}
		});
	}

	for (const [name, createLoader] of [
		['async', createLoad],
		['sync', createLoadSync],
	] as const) {
		await test(`${name} preserves a composed CommonJS source for a TypeScript symlink entry`, async () => {
			await using fixture = await createFixture({
				'package.json': '{}',
				'target.txt': 'throw new Error("disk source must not replace provider source")',
			});
			const entryPath = fixture.getPath('entry.ts');
			const targetPath = fixture.getPath('target.txt');
			const targetUrl = pathToFileURL(targetPath).toString();
			const originalArgv = process.argv;
			const originalRealpath = fs.realpathSync;
			using realpath = spyOn(fs, 'realpathSync');
			realpath.willCall((filePath, ...options) => (
				filePath === entryPath ? targetPath : originalRealpath(filePath, ...options)
			));
			syncBuiltinESMExports();
			process.argv = [process.execPath];
			try {
				const load = createLoader(createData({
					entryPath,
					tsconfig: false,
				}));
				const moduleResult = await load(targetUrl, {
					format: 'module',
					conditions: ['import'],
					importAttributes: {},
				}, () => ({
					format: 'module',
					source: 'const value: number = 706; export default value;',
				}));
				expect(moduleResult.format).toBe('module');
				expect(moduleResult.source).not.toContain(': number');
				const provided = {
					format: 'commonjs',
					source: 'module.exports = __filename;',
					shortCircuit: true,
				};
				expect(await load(targetUrl, {
					format: 'commonjs',
					conditions: ['import'],
					importAttributes: {},
				}, () => provided)).toStrictEqual(provided);
				const json = {
					format: 'json',
					source: '{"marker":"provider-json"}',
					shortCircuit: true,
				};
				expect(await load(targetUrl, {
					format: 'json',
					importAttributes: { type: 'json' },
					conditions: ['require'],
				}, () => json)).toStrictEqual(json);
				const jsonImport = await load(targetUrl, {
					format: 'json',
					conditions: ['import'],
					importAttributes: { type: 'json' },
				}, () => ({ ...json }));
				expect(jsonImport.format).toBe('module');
			} finally {
				process.argv = originalArgv;
				realpath.restore();
				syncBuiltinESMExports();
			}
		});
	}

	test('maps Node-provided TypeScript formats without reading package.json', async () => {
		await using fixture = await createFixture({
			'package.json': '{ invalid',
			'module.ts': '',
			'commonjs.ts': '',
		});
		const resolve = createResolve(createDefaultData());
		const moduleUrl = pathToFileURL(fixture.getPath('module.ts')).toString();
		const commonJsUrl = pathToFileURL(fixture.getPath('commonjs.ts')).toString();

		const [moduleResult, commonJsResult] = await Promise.all([
			resolve(moduleUrl, context, () => ({
				url: moduleUrl,
				format: 'module-typescript',
			})),
			resolve(commonJsUrl, context, () => ({
				url: commonJsUrl,
				format: 'commonjs-typescript',
			})),
		]);

		expect(moduleResult).toStrictEqual({
			url: moduleUrl,
			format: 'module',
		});
		expect(commonJsResult).toStrictEqual({
			url: commonJsUrl,
			format: 'commonjs',
		});
	});

	test('preserves package lookup when Node provides no format', async () => {
		await using fixture = await createFixture({
			'package.json': '{}',
			'index.ts': '',
		});
		const url = pathToFileURL(fixture.getPath('index.ts')).toString();
		const resolve = createResolve(createDefaultData());

		const result = await resolve(url, context, () => ({ url }));

		expect(result).toStrictEqual({
			url,
			format: 'commonjs',
		});
	});

	test('excludes node: builtins and preserves namespace isolation for other URLs', async () => {
		const namespaceA = 'async-a';
		const namespaceB = 'async-b';
		const resolveA = createResolve({
			...createDefaultData(),
			namespace: namespaceA,
		});
		const resolveB = createResolve({
			...createDefaultData(),
			namespace: namespaceB,
		});
		const requireContext = createNamespaceContext(
			namespaceA,
			['require', 'node', 'node-addons', 'module-sync'],
		);

		// Node returns a bare builtin with no format in a require context, so the
		// builtin guard cannot identify it. The node: prefix must.
		expect(
			await resolveA('fs', requireContext, () => ({
				url: 'node:fs',
				format: undefined,
			})),
		).toStrictEqual({
			url: 'node:fs',
			format: undefined,
		});

		expect(
			await resolveA(moduleFileUrl, requireContext, () => ({
				url: moduleFileUrl,
				format: 'module' as const,
			})),
		).toStrictEqual({
			url: `${moduleFileUrl}?tsx-namespace=${namespaceA}`,
			format: 'module',
		});

		// A composed loader can resolve a non-data specifier to a data: URL.
		// Namespace inheritance must still give each namespace a distinct instance.
		const dataUrl = 'data:text/javascript,export%20default%201';
		const [dataA, dataB] = await Promise.all([
			resolveA('virtual-module', createNamespaceContext(namespaceA), () => ({
				url: dataUrl,
				format: 'module' as const,
			})),
			resolveB('virtual-module', createNamespaceContext(namespaceB), () => ({
				url: dataUrl,
				format: 'module' as const,
			})),
		]);
		expect(dataA).toStrictEqual({
			url: `${dataUrl}#tsx-namespace=${namespaceA}`,
			format: 'module',
		});
		expect(dataB).toStrictEqual({
			url: `${dataUrl}#tsx-namespace=${namespaceB}`,
			format: 'module',
		});
	});

	test('merges async loader URL metadata without mutating its result', async () => {
		await using fixture = await createFixture({
			'module.ts': '',
		});
		const resolve = createResolve(createDefaultData());
		const moduleUrl = pathToFileURL(fixture.getPath('module.ts')).toString();
		const nextResult = {
			url: `${moduleUrl}?observer=1`,
			format: 'module' as const,
		};

		const first = await resolve(`${moduleUrl}?request=one#fragment`, context, () => nextResult);
		const second = await resolve(`${moduleUrl}?request=two#fragment`, context, () => nextResult);

		expect(first).toStrictEqual({
			url: `${moduleUrl}?observer=1&request=one#fragment`,
			format: 'module',
		});
		expect(second).toStrictEqual({
			url: `${moduleUrl}?observer=1&request=two#fragment`,
			format: 'module',
		});
		expect(nextResult).toStrictEqual({
			url: `${moduleUrl}?observer=1`,
			format: 'module',
		});
	});

	test('maps Node-provided TypeScript formats in sync hooks without reading package.json', async () => {
		await using fixture = await createFixture({
			'package.json': '{ invalid',
			'module.ts': '',
			'commonjs.ts': '',
		});
		const resolve = createResolveSync(createDefaultData());
		const moduleUrl = pathToFileURL(fixture.getPath('module.ts')).toString();
		const commonJsUrl = pathToFileURL(fixture.getPath('commonjs.ts')).toString();

		const moduleResult = resolve(moduleUrl, context, () => ({
			url: moduleUrl,
			format: 'module-typescript',
		}));
		const commonJsResult = resolve(commonJsUrl, context, () => ({
			url: commonJsUrl,
			format: 'commonjs-typescript',
		}));

		expect(moduleResult).toStrictEqual({
			url: moduleUrl,
			format: 'module',
		});
		expect(commonJsResult).toStrictEqual({
			url: commonJsUrl,
			format: 'commonjs',
		});
	});

	test('preserves package lookup in sync hooks when Node provides no format', async () => {
		await using fixture = await createFixture({
			'package.json': '{}',
			'index.ts': '',
		});
		const url = pathToFileURL(fixture.getPath('index.ts')).toString();
		const resolve = createResolveSync(createDefaultData());

		const result = resolve(url, context, () => ({ url }));

		expect(result).toStrictEqual({
			url,
			format: 'commonjs',
		});
	});

	test('excludes node: builtins and preserves namespace isolation in sync hooks', () => {
		const namespaceA = 'sync-a';
		const namespaceB = 'sync-b';
		const resolveA = createResolveSync({
			...createDefaultData(),
			namespace: namespaceA,
		});
		const resolveB = createResolveSync({
			...createDefaultData(),
			namespace: namespaceB,
		});

		// The global CJS loader routes require contexts to the CJS hook, so the
		// sync resolve only sees them when that loader is inactive. Namespace
		// inheritance is context-independent, so an import context exercises it
		// without mutating the global loader state.
		expect(
			resolveA('fs', createNamespaceContext(namespaceA), () => ({
				url: 'node:fs',
				format: undefined,
			})),
		).toStrictEqual({
			url: 'node:fs',
			format: undefined,
		});

		expect(
			resolveA(moduleFileUrl, createNamespaceContext(namespaceA), () => ({
				url: moduleFileUrl,
				format: 'module' as const,
			})),
		).toStrictEqual({
			url: `${moduleFileUrl}?tsx-namespace=${namespaceA}`,
			format: 'module',
		});

		// A composed loader can resolve a non-data specifier to a data: URL.
		// Namespace inheritance must still give each namespace a distinct instance.
		const dataUrl = 'data:text/javascript,export%20default%201';
		const dataA = resolveA('virtual-module', createNamespaceContext(namespaceA), () => ({
			url: dataUrl,
			format: 'module' as const,
		}));
		const dataB = resolveB('virtual-module', createNamespaceContext(namespaceB), () => ({
			url: dataUrl,
			format: 'module' as const,
		}));
		expect(dataA).toStrictEqual({
			url: `${dataUrl}#tsx-namespace=${namespaceA}`,
			format: 'module',
		});
		expect(dataB).toStrictEqual({
			url: `${dataUrl}#tsx-namespace=${namespaceB}`,
			format: 'module',
		});
	});

	test('merges sync loader URL metadata without mutating its result', async () => {
		await using fixture = await createFixture({
			'module.ts': '',
		});
		const resolve = createResolveSync(createDefaultData());
		const moduleUrl = pathToFileURL(fixture.getPath('module.ts')).toString();
		const nextResult = {
			url: `${moduleUrl}?observer=1`,
			format: 'module' as const,
		};

		const first = resolve(`${moduleUrl}?request=one#fragment`, context, () => nextResult);
		const second = resolve(`${moduleUrl}?request=two#fragment`, context, () => nextResult);

		expect(first).toStrictEqual({
			url: `${moduleUrl}?observer=1&request=one#fragment`,
			format: 'module',
		});
		expect(second).toStrictEqual({
			url: `${moduleUrl}?observer=1&request=two#fragment`,
			format: 'module',
		});
		expect(nextResult).toStrictEqual({
			url: `${moduleUrl}?observer=1`,
			format: 'module',
		});
	});

	test('restores a percent-encoded custom CJS bridge namespace', async () => {
		const namespace = 'a/b';
		const filePath = '/virtual/dep.mjs';
		// tsx's CommonJS bridge serializes the namespace into the filename, then
		// Node's pathToFileURL() encodes the `?` and the existing `%` again.
		const bridgeUrl = pathToFileURL(
			`${filePath}?namespace=${encodeURIComponent(namespace)}`,
		).toString();
		const nextResult = (specifier: string) => ({
			url: specifier,
			format: 'module' as const,
		});
		const expected = {
			url: `${pathToFileURL(filePath)}?tsx-namespace=${encodeURIComponent(namespace)}`,
			format: 'module',
		};

		const hookData = createData({
			namespace,
			tsconfig: false,
		});
		const asyncResult = await createResolve(hookData)(bridgeUrl, context, nextResult);
		const syncResult = createResolveSync(hookData)(bridgeUrl, context, nextResult);

		expect(asyncResult).toStrictEqual(expected);
		expect(syncResult).toStrictEqual(expected);
	});

	test('restores percent-encoded dependency query values from the CJS bridge', async () => {
		const namespace = 'active';
		const filePath = '/virtual/dep.mjs';
		const bridgeUrl = pathToFileURL(
			`${filePath}?x=a%2Fb&y=a%26b&namespace=${namespace}`,
		).toString();
		const nextResult = (specifier: string) => ({
			url: specifier,
			format: 'module' as const,
		});
		const expected = {
			url: `${pathToFileURL(filePath)}?x=a%2Fb&y=a%26b&tsx-namespace=${namespace}`,
			format: 'module',
		};

		const hookData = createData({
			namespace,
			tsconfig: false,
		});
		const asyncResult = await createResolve(hookData)(bridgeUrl, context, nextResult);
		const syncResult = createResolveSync(hookData)(bridgeUrl, context, nextResult);

		expect(asyncResult).toStrictEqual(expected);
		expect(syncResult).toStrictEqual(expected);
		// Values must survive as values, not as re-encoded delimiters.
		expect(new URL(asyncResult.url).searchParams.get('x')).toBe('a/b');
		expect(new URL(syncResult.url).searchParams.get('y')).toBe('a&b');
	});

	test('leaves a literal percent-encoded question mark path unchanged under a namespace', async () => {
		const hookData = createData({
			namespace: 'active',
			tsconfig: false,
		});
		// A real filename may contain `?`, which pathToFileURL() encodes as `%3F`.
		// Only the bridge's `?namespace=` suffix may be restored, so an active
		// namespace must not rewrite this path.
		const literalUrl = pathToFileURL('/virtual/file?name.ts').toString();
		const resolvedSpecifiers: string[] = [];
		const nextResult = (specifier: string) => {
			resolvedSpecifiers.push(specifier);
			return {
				url: specifier,
				format: 'module' as const,
			};
		};

		const asyncResult = await createResolve(hookData)(literalUrl, context, nextResult);
		const syncResult = createResolveSync(hookData)(literalUrl, context, nextResult);

		expect(resolvedSpecifiers).toStrictEqual([literalUrl, literalUrl]);
		expect(asyncResult.url).toBe(literalUrl);
		expect(syncResult.url).toBe(literalUrl);
	});

	test('leaves a percent-encoded bridge suffix from another namespace unchanged', async () => {
		const hookData = createData({
			namespace: 'active',
			tsconfig: false,
		});
		// The suffix matches the bridge shape but belongs to a different
		// tsImport() namespace, so it must be left for the owning hook.
		const foreignBridgeUrl = pathToFileURL('/virtual/dep.mjs?namespace=other').toString();
		const resolvedSpecifiers: string[] = [];
		const nextResult = (specifier: string) => {
			resolvedSpecifiers.push(specifier);
			return {
				url: specifier,
				format: 'module' as const,
			};
		};

		const asyncResult = await createResolve(hookData)(foreignBridgeUrl, context, nextResult);
		const syncResult = createResolveSync(hookData)(foreignBridgeUrl, context, nextResult);

		expect(resolvedSpecifiers).toStrictEqual([foreignBridgeUrl, foreignBridgeUrl]);
		expect(asyncResult.url).toBe(foreignBridgeUrl);
		expect(syncResult.url).toBe(foreignBridgeUrl);
	});
});
