import { pathToFileURL } from 'url';
import type { TransformOptions } from 'esbuild';
import {
	transform as esbuildTransform,
	transformSync as esbuildTransformSync,
	version as esbuildVersion,
} from 'esbuild';
import { sha1 } from '../sha1.js';
import { version as transformDynamicImportVersion, transformDynamicImport } from './transform-dynamic-import.js';
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

// Used by cjs-loader
export function transformSync(
	code: string,
	filePath: string,
	extendOptions?: TransformOptions,
): Transformed {
	const define: { [key: string]: string } = {};

	if (!(filePath.endsWith('.cjs') || filePath.endsWith('.cts'))) {
		define['import.meta.url'] = `'${pathToFileURL(filePath)}'`;
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
					return patchResults(
						esbuildTransformSync(code, esbuildOptions),
					);
				},
				transformDynamicImport,
			],
		);

		cache.set(hash, transformed);
	}

	if (transformed.warnings && transformed.warnings.length > 0) {
		const { warnings } = transformed;
		for (const warning of warnings) {
			console.error(warning);
		}
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
					return patchResults(
						await esbuildTransform(code, esbuildOptions),
					);
				},
				transformDynamicImport,
			],
		);

		cache.set(hash, transformed);
	}

	if (transformed.warnings && transformed.warnings.length > 0) {
		const { warnings } = transformed;
		for (const warning of warnings) {
			console.error(warning);
		}
	}

	return transformed;
}
