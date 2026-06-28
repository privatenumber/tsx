import { describe, test, expect } from 'manten';
import { mapTsExtensions } from '../../src/utils/map-ts-extensions.js';

// A candidate that ends in two module extensions (e.g. `foo.ts.ts`, `foo.js.tsx`)
// can never exist for a normally-authored import. Generating one makes the
// resolver probe a whole dead branch of the filesystem.
const doubledExtension = /\.[cm]?[jt]sx?\.[cm]?[jt]sx?(\?|$)/;

export const mapTsExtensionsSpec = () => describe('mapTsExtensions', () => {
	test('explicit TypeScript extension resolves as-is', () => {
		expect(mapTsExtensions('./foo.ts')).toStrictEqual(['./foo.ts']);
		expect(mapTsExtensions('./foo.tsx')).toStrictEqual(['./foo.tsx']);
		expect(mapTsExtensions('./foo.cts')).toStrictEqual(['./foo.cts']);
		expect(mapTsExtensions('./foo.mts')).toStrictEqual(['./foo.mts']);
	});

	test('preserves the query string', () => {
		expect(mapTsExtensions('./foo.ts?key=value')).toStrictEqual(['./foo.ts?key=value']);
		expect(mapTsExtensions('./foo.js?key=value')).toStrictEqual([
			'./foo.ts?key=value',
			'./foo.tsx?key=value',
			'./foo.js?key=value',
			'./foo.jsx?key=value',
		]);
	});

	test('swaps JS extensions for TypeScript equivalents', () => {
		expect(mapTsExtensions('./foo.js')).toStrictEqual([
			'./foo.ts',
			'./foo.tsx',
			'./foo.js',
			'./foo.jsx',
		]);
		expect(mapTsExtensions('./foo.jsx')).toStrictEqual([
			'./foo.tsx',
			'./foo.ts',
			'./foo.jsx',
			'./foo.js',
		]);
	});

	test('guesses extensions for extensionless local files (TypeScript first)', () => {
		expect(mapTsExtensions('./foo')).toStrictEqual([
			'./foo.ts',
			'./foo.tsx',
			'./foo.jsx',
			'./foo.js',
			'./foo.json',
		]);
	});

	test('guesses extensions for dependencies (JavaScript first)', () => {
		expect(mapTsExtensions('foo')).toStrictEqual([
			'foo.js',
			'foo.json',
			'foo.ts',
			'foo.tsx',
			'foo.jsx',
		]);
	});

	test('never emits dead candidates with doubled extensions', () => {
		const requests = [
			'./foo.ts',
			'./foo.tsx',
			'./foo.cts',
			'./foo.mts',
			'./foo.js',
			'./foo.jsx',
			'./foo.cjs',
			'./foo.mjs',
		];
		for (const request of requests) {
			for (const candidate of mapTsExtensions(request)) {
				expect(candidate).not.toMatch(doubledExtension);
			}
		}
	});
});
