import { pathToFileURL } from 'node:url';
import {
	transform as esbuildTransform,
	transformSync as esbuildTransformSync,
	version as esbuildVersion,
	type TransformOptions,
	type TransformFailure,
} from 'esbuild';
import { sha1 } from '../sha1.js';
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

// Used by cjs-loader
export const transformSync = (
	code: string,
	filePath: string,
	extendOptions?: TransformOptions,
): Transformed => {
	const [filePathWithoutQuery, query] = filePath.split('?');
	const define: { [key: string]: string } = {};

	if (!(filePathWithoutQuery.endsWith('.cjs') || filePathWithoutQuery.endsWith('.cts'))) {
		define['import.meta.url'] = JSON.stringify(pathToFileURL(filePathWithoutQuery) + (query ? `?${query}` : ''));
	}

	const esbuildOptions = {
		...cacheConfig,
		format: 'cjs',
		sourcefile: filePathWithoutQuery,
		define,
		banner: '(()=>{',
		footer: '})()',

		// CJS Annotations for Node. Used by ESM loader for CJS interop
		platform: 'node',

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
