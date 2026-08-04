import type { ResolveHookContext } from 'node:module';
import { pathToFileURL } from 'node:url';
import { createFixture } from 'fs-fixture';
import { describe, expect, test } from 'manten';
import { createDefaultData } from '../../src/esm/hook/initialize.js';
import { createResolve, createResolveSync } from '../../src/esm/hook/resolve.js';

const context: ResolveHookContext = {
	conditions: ['node', 'import'],
	importAttributes: {},
	parentURL: undefined,
};

export const esmHookResolve = () => describe('ESM resolve hook', () => {
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
});
