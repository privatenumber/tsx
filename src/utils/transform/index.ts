import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import {
	transform as esbuildTransform,
	transformSync as esbuildTransformSync,
	version as esbuildVersion,
	type TransformOptions,
	type TransformFailure,
} from 'esbuild';
import { sha1 } from '../sha1.js';
import { parseEsm } from '../es-module-lexer.js';
import { importMetaPathProperties, isFeatureSupported } from '../node-features.js';
import {
	version as transformDynamicImportVersion,
	transformDynamicImport,
} from './transform-dynamic-import.js';
import cache from './cache.js';
import {
	applyTransformersSync,
	applyTransformers,
	type Transformed,
} from './apply-transformers.js';
import {
	cacheConfig,
	patchOptions,
} from './get-esbuild-options.js';

const formatEsbuildError = (
	error: TransformFailure,
) => {
	error.name = 'TransformError';
	// @ts-expect-error deleting non-option property
	delete error.errors;
	// @ts-expect-error deleting non-option property
	delete error.warnings;
	throw error;
};

const getImportMeta = (
	filePath: string,
	url: string,
) => ({
	...(
		// Keep dirname/filename aligned to Node in this major because exposing
		// new properties can break user shims. In the next major, tsx can
		// backport them because transformed CJS already owns import.meta.
		isFeatureSupported(importMetaPathProperties)
			? {
				dirname: path.dirname(filePath),
				filename: filePath,
			}
			: {}
	),
	url,
});

type TransformSyncOptions = TransformOptions & {
	cjsBanner?: string;
};

/**
 * ES modules are always strict, but Node compiles the transformed output inside
 * a sloppy CommonJS wrapper. The directive opens the banner's IIFE so the module
 * keeps the mode it was authored against.
 * https://tc39.es/ecma262/#sec-strict-mode-code
 */
const useStrictDirective = '"use strict";';

const commonJsExtensions = ['.cjs', '.cts'];
const esmExtensions = ['.mjs', '.mts'];

/**
 * `isEsm` mirrors Node's module syntax detection, plus `.mjs` & `.mts`, which
 * are ES modules regardless of the syntax they contain. `.cjs` & `.cts` are
 * CommonJS on the same terms, so they're not parsed at all.
 *
 * Both facts are read from one parse because the lexer already runs on every
 * CommonJS transform.
 */
const parseModuleSyntax = (
	code: string,
	filePath: string,
) => {
	if (commonJsExtensions.some(extension => filePath.endsWith(extension))) {
		return;
	}

	const isEsmExtension = esmExtensions.some(extension => filePath.endsWith(extension));

	if (!code.includes('import') && !code.includes('export')) {
		return {
			isEsm: isEsmExtension,
			hasImportMeta: false,
		};
	}

	try {
		const parsed = parseEsm(code, filePath);
		return {
			isEsm: isEsmExtension || parsed[3],
			hasImportMeta: parsed[0].some(imported => imported.d === -2),
		};
	} catch {
		// Let esbuild report the source syntax error.
		return {
			isEsm: true,
			hasImportMeta: true,
		};
	}
};

// Used by cjs-loader
export const transformSync = (
	code: string,
	filePathOrUrl: string,
	extendOptions?: TransformSyncOptions,
): Transformed => {
	let url: string;
	let filePath: string;
	let query: string | undefined;

	if (filePathOrUrl.startsWith('file://')) {
		url = filePathOrUrl;
		const parsed = new URL(filePathOrUrl);
		filePath = fileURLToPath(parsed);
	} else {
		[filePath, query] = filePathOrUrl.split('?');
		url = pathToFileURL(filePath) + (query ? `?${query}` : '');
	}

	const {
		cjsBanner,
		...extendOptionsWithoutCjsBanner
	} = extendOptions ?? {};

	const moduleSyntax = (
		(extendOptionsWithoutCjsBanner.format ?? 'cjs') === 'cjs'
			? parseModuleSyntax(code, filePath)
			: undefined
	);

	const esbuildOptions: TransformOptions = {
		...cacheConfig,
		format: 'cjs',
		sourcefile: filePath,
		banner: `__filename=${JSON.stringify(filePath)};(()=>{${moduleSyntax?.isEsm ? useStrictDirective : ''}${cjsBanner ?? ''}`,
		footer: '})()',

		// CJS Annotations for Node. Used by ESM loader for CJS interop
		platform: 'node',

		...extendOptionsWithoutCjsBanner,
	};

	if (moduleSyntax?.hasImportMeta) {
		esbuildOptions.define = {
			...esbuildOptions.define,
			'import.meta': JSON.stringify(getImportMeta(filePath, url)),
		};
	}

	const hash = sha1([
		code,
		url,
		JSON.stringify(esbuildOptions),
		esbuildVersion,
		transformDynamicImportVersion,
	].join('-'));
	let transformed = cache.get(hash);

	if (!transformed) {
		transformed = applyTransformersSync(
			filePathOrUrl,
			code,
			[
				(_filePath, _code) => {
					const patchResult = patchOptions(esbuildOptions);
					let result;
					try {
						result = esbuildTransformSync(_code, esbuildOptions);
					} catch (error) {
						throw formatEsbuildError(error as TransformFailure);
					}
					return patchResult(result);
				},
				(_filePath, _code) => transformDynamicImport(_filePath, _code, true),
			],
		);

		cache.set(hash, transformed);
	}

	return transformed;
};

// Used by esm-loader
export const transform = async (
	code: string,
	filePath: string,
	extendOptions?: TransformOptions,
): Promise<Transformed> => {
	const esbuildOptions = {
		...cacheConfig,
		format: 'esm',
		sourcefile: filePath,
		...extendOptions,
	} as const;

	const hash = sha1([
		code,
		JSON.stringify(esbuildOptions),
		esbuildVersion,
		transformDynamicImportVersion,
	].join('-'));
	let transformed = cache.get(hash);

	if (!transformed) {
		transformed = await applyTransformers(
			filePath,
			code,
			[
				async (_filePath, _code) => {
					const patchResult = patchOptions(esbuildOptions);
					let result;
					try {
						result = await esbuildTransform(_code, esbuildOptions);
					} catch (error) {
						throw formatEsbuildError(error as TransformFailure);
					}
					return patchResult(result);
				},
				(_filePath, _code) => transformDynamicImport(_filePath, _code, true),
			],
		);

		cache.set(hash, transformed);
	}

	return transformed;
};

export const transformEsmSync = (
	code: string,
	filePath: string,
	extendOptions?: TransformOptions,
): Transformed => {
	const esbuildOptions = {
		...cacheConfig,
		format: 'esm',
		sourcefile: filePath,
		...extendOptions,
	} as const;

	const hash = sha1([
		code,
		JSON.stringify(esbuildOptions),
		esbuildVersion,
		transformDynamicImportVersion,
	].join('-'));
	let transformed = cache.get(hash);

	if (!transformed) {
		transformed = applyTransformersSync(
			filePath,
			code,
			[
				(_filePath, _code) => {
					const patchResult = patchOptions(esbuildOptions);
					let result;
					try {
						result = esbuildTransformSync(_code, esbuildOptions);
					} catch (error) {
						throw formatEsbuildError(error as TransformFailure);
					}
					return patchResult(result);
				},
				(_filePath, _code) => transformDynamicImport(_filePath, _code, true),
			],
		);

		cache.set(hash, transformed);
	}

	return transformed;
};
