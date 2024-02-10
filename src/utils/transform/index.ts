import { pathToFileURL } from 'url';
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

const handleEsbuildError = (
	error: TransformFailure,
) => {
	const [firstError] = error.errors;
	let errorMessage = `[esbuild Error]: ${firstError.text}`;

	if (firstError.location) {
		const { file, line, column } = firstError.location;
		errorMessage += `\n    at ${file}:${line}:${column}`;
	}

	console.error(errorMessage);
	process.exit(1);
};

// Used by cjs-loader
export function transformSync(
	code: string,
	filePath: string,
	extendOptions?: TransformOptions,
): Transformed {
	const define: { [key: string]: string } = {};

	if (!(filePath.endsWith('.cjs') || filePath.endsWith('.cts'))) {
		define['import.meta.url'] = JSON.stringify(pathToFileURL(filePath));
	}

	const esbuildOptions = {
		...cacheConfig,
		format: 'cjs',
		sourcefile: filePath,
		define,
		banner: '(()=>{',
		footer: '})()',
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
				// eslint-disable-next-line @typescript-eslint/no-shadow
				(_filePath, code) => {
					const patchResults = patchOptions(esbuildOptions);
					try {
						return patchResults(
							esbuildTransformSync(code, esbuildOptions),
						);
					} catch (error) {
						handleEsbuildError(error as TransformFailure);

						/**
						 * esbuild warnings are ignored because they're usually caught
						 * at runtime by Node.js with better errors + stack traces
						 */
					}
				},
				transformDynamicImport,
			],
		);

		cache.set(hash, transformed);
	}

	return transformed;
}

// Used by esm-loader
export async function transform(
	code: string,
	filePath: string,
	extendOptions?: TransformOptions,
): Promise<Transformed> {
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
				// eslint-disable-next-line @typescript-eslint/no-shadow
				async (_filePath, code) => {
					const patchResults = patchOptions(esbuildOptions);
					try {
						return patchResults(
							await esbuildTransform(code, esbuildOptions),
						);
					} catch (error) {
						handleEsbuildError(error as TransformFailure);

						/**
						 * esbuild warnings are ignored because they're usually caught
						 * at runtime by Node.js with better errors + stack traces
						 */
					}
				},
				transformDynamicImport,
			],
		);

		cache.set(hash, transformed);
	}

	return transformed;
}
