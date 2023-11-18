import { pathToFileURL } from 'url';
import type { TransformOptions } from 'esbuild';
import {
	transform as esbuildTransform,
	transformSync as esbuildTransformSync,
	version as esbuildVersion,
} from 'esbuild';
import { sha1 } from '../sha1';
import { version as transformDynamicImportVersion, transformDynamicImport } from './transform-dynamic-import';
import cache from './cache';
import {
	applyTransformersSync,
	applyTransformers,
	type Transformed,
} from './apply-transformers';
import {
	cacheConfig,
	patchOptions,
} from './get-esbuild-options';

// Used by cjs-loader
export function transformSync(
	code: string,
	filePath: string,
	extendOptions?: TransformOptions,
): Transformed {
	const define: { [key: string]: string } = {};

	if (!(filePath.endsWith('.cjs') || filePath.endsWith('.cts'))) {
		// TODO: test this
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
			] as const,
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
			] as const,
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
