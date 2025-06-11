import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { LoadHook } from 'node:module';
import { readFile } from 'node:fs/promises';
import type { TransformOptions } from 'esbuild';
import { transform, transformSync } from '../../utils/transform/index.js';
import { transformDynamicImport } from '../../utils/transform/transform-dynamic-import.js';
import { inlineSourceMap } from '../../source-map.js';
import {
	isFeatureSupported,
	importAttributes,
	esmLoadReadFile,
	requireEsm,
	loadReadFromSource,
} from '../../utils/node-features.js';
import { parent } from '../../utils/ipc/client.js';
import type { Message } from '../types.js';
import { fileMatcher } from '../../utils/tsconfig.js';
import { isJsonPattern, tsExtensionsPattern, fileUrlPrefix } from '../../utils/path-utils.js';
import { isESM } from '../../utils/es-module-lexer.js';
import { logEsm as log, debugEnabled } from '../../utils/debug.js';
import { getNamespace, decodeCjsQuery } from './utils.js';
import { data } from './initialize.js';

const importAttributesProperty = (
	isFeatureSupported(importAttributes)
		? 'importAttributes'
		: 'importAssertions' as 'importAttributes'
);

// eslint-disable-next-line import-x/no-mutable-exports
let load: LoadHook = async (
	url,
	context,
	nextLoad,
) => {
	if (!data.active) {
		return nextLoad(url, context);
	}

	// TODO: Add version
	url = decodeCjsQuery(url);

	const urlNamespace = getNamespace(url);
	if (data.namespace && data.namespace !== urlNamespace) {
		return nextLoad(url, context);
	}

	if (data.port) {
		const parsedUrl = new URL(url);
		parsedUrl.searchParams.delete('tsx-namespace');
		data.port.postMessage({
			type: 'load',
			url: parsedUrl.toString(),
		} satisfies Message);
	}

	/*
	Filter out node:*
	Maybe only handle files that start with file://
	*/
	if (parent.send) {
		parent.send({
			type: 'dependency',
			path: url,
		});
	}

	const filePath = url.startsWith(fileUrlPrefix) ? fileURLToPath(url) : url;

	if (context.format === 'module-json') {
		const code = await readFile(new URL(url), 'utf8');
		const transformed = await transform(
			code,
			filePath,
			{
				tsconfigRaw: (
					path.isAbsolute(filePath)
						? fileMatcher?.(filePath) as TransformOptions['tsconfigRaw']
						: undefined
				),
			},
		);
		return {
			shortCircuit: true,
			format: 'module',
			source: inlineSourceMap(transformed),
		};
	}

	if (context.format === 'commonjs-json') {
		const code = await readFile(new URL(url), 'utf8');
		const transformed = transformSync(
			code,
			filePath,
			{
				tsconfigRaw: (
					path.isAbsolute(filePath)
						? fileMatcher?.(filePath) as TransformOptions['tsconfigRaw']
						: undefined
				),
			},
		);

		transformed.code += `\n0 && (module.exports = ${
			JSON.stringify(Object.fromEntries(Object.keys(JSON.parse(code)).map(key => [key, 0])))
		});`;

		return {
			shortCircuit: true,
			format: 'commonjs',
			source: inlineSourceMap(transformed),
		};
	}

	/**
	 * For compiling ambiguous ESM (ESM syntax in a package without type)
	 * So Node.js can kind of do this now, but it tries CommonJS first, and if it fails,
	 * it uses NATIVE ESM. This means ESM code that uses mixed syntax (e.g. __dirname)
	 * wil not work.
	 */
	if (
		(
			context.format === undefined
			|| context.format === 'commonjs'
			|| context.format === 'commonjs-typescript'
		)
		&& isFeatureSupported(esmLoadReadFile)
		&& url.startsWith('file:') // Could be data:
		&& filePath.endsWith('.js')
	) {
		const code = await readFile(new URL(url), 'utf8');

		// if the file extension is .js, only transform if using esm syntax
		if (isESM(code)) {
			/**
			 * es or cjs module lexer unfortunately cannot be used because it doesn't support
			 * typescript syntax
			 *
			 * While the full code is transformed, only the exports are used for parsing.
			 * In fact, the code can't even run because imports cannot be resolved relative
			 * from the data: URL.
			 *
			 * This should pre-compile for the CJS loader to have a cache hit
			 *
			 * I considered extracting the CJS exports from esbuild via (0&&(module.exports={})
			 * to minimize the data URL size but this only works for ESM->CJS and not CTS files
			 * which are already in CJS syntax.
			 * In CTS, module.exports can be written in any pattern.
			 */
			const transformed = transformSync(
				code,
				url,
				{
					tsconfigRaw: fileMatcher?.(filePath) as TransformOptions['tsconfigRaw'],
				},
			);

			if (isFeatureSupported(loadReadFromSource)) {
				return {
					shortCircuit: true,
					format: 'commonjs',

					// This is necessary for CJS exports to be parsed correctly
					// Returning a `source` makes the ESM translator to handle
					// the CJS compilation and skips the CJS loader
					source: inlineSourceMap(transformed),
				};
			}

			const filePathWithNamespace = urlNamespace ? `${filePath}?namespace=${encodeURIComponent(urlNamespace)}` : filePath;
			return {
				shortCircuit: true,
				format: 'commonjs',
				responseURL: `data:text/javascript,${encodeURIComponent(transformed.code)}?filePath=${encodeURIComponent(filePathWithNamespace)}`,
			};
		}
	}

	if (isJsonPattern.test(url)) {
		let contextAttributes = context[importAttributesProperty];
		if (!contextAttributes) {
			contextAttributes = {};
			context[importAttributesProperty] = contextAttributes;
		}

		if (!contextAttributes.type) {
			contextAttributes.type = 'json';
		}
	}

	const loaded = await nextLoad(url, context);
	log('loaded by next loader', {
		url,
		loaded,
	});

	if (
		isFeatureSupported(loadReadFromSource)
		&& loaded.format === 'commonjs'
		&& filePath.endsWith('.cjs')
	) {
		let code = await readFile(new URL(url), 'utf8');
		// Contains native ESM check
		const transformed = transformDynamicImport(filePath, code);
		if (transformed) {
			code = inlineSourceMap(transformed);
		}
		loaded.source = code;
		loaded.shortCircuit = true;
		return loaded;
	}

	if (
		loaded.format === 'commonjs'
		&& isFeatureSupported(esmLoadReadFile)
		&& loaded.responseURL?.startsWith('file:') // Could be data:
		&& !filePath.endsWith('.cjs') // CJS syntax doesn't need to be transformed for interop
	) {
		const code = await readFile(new URL(url), 'utf8');

		// if the file extension is .js, only transform if using esm syntax
		if (
			// TypeScript files
			!filePath.endsWith('.js')

			// ESM syntax in CommonJS type package
			|| isESM(code)
		) {
			/**
			 * es or cjs module lexer unfortunately cannot be used because it doesn't support
			 * typescript syntax
			 *
			 * While the full code is transformed, only the exports are used for parsing.
			 * In fact, the code can't even run because imports cannot be resolved relative
			 * from the data: URL.
			 *
			 * This should pre-compile for the CJS loader to have a cache hit
			 *
			 * I considered extracting the CJS exports from esbuild via (0&&(module.exports={})
			 * to minimize the data URL size but this only works for ESM->CJS and not CTS files
			 * which are already in CJS syntax.
			 * In CTS, module.exports can be written in any pattern.
			 */
			const transformed = transformSync(
				code,
				url,
				{
					tsconfigRaw: fileMatcher?.(filePath) as TransformOptions['tsconfigRaw'],
				},
			);

			if (isFeatureSupported(loadReadFromSource)) {
				/**
				 * Compile ESM to CJS
				 * In v22.15, the CJS loader logic is now moved to the ESM loader
				 */
				loaded.source = inlineSourceMap(transformed);
			} else {
				/**
				 * This tricks Node into thinking the file is a data URL so it doesn't try to read from disk
				 * to parse the CJS exports
				 */
				const filePathWithNamespace = urlNamespace ? `${filePath}?namespace=${encodeURIComponent(urlNamespace)}` : filePath;
				loaded.responseURL = `data:text/javascript,${encodeURIComponent(transformed.code)}?filePath=${encodeURIComponent(filePathWithNamespace)}`;
			}

			log('returning CJS export annotation', loaded);
			return loaded;
		}
	}

	// CommonJS and Internal modules (e.g. node:*)
	if (!loaded.source) {
		return loaded;
	}

	const code = loaded.source.toString();

	// Since CJS can now require ESM, JSONs are now handled by the
	// ESM loader as ESM in module contexts
	// TODO: If we can detect whether this was "required",
	// we can let the CJS loader handler it by returning an empty source
	// Support named imports in JSON modules
	/**
	 * In versions of Node that supports require'ing ESM,
	 */
	if (
		isFeatureSupported(requireEsm)
		&& loaded.format === 'json'
	) {
		const transformed = transformSync(
			code,
			filePath,
			{
				tsconfigRaw: (
					path.isAbsolute(filePath)
						? fileMatcher?.(filePath) as TransformOptions['tsconfigRaw']
						: undefined
				),
			},
		);

		transformed.code += `\n0 && (module.exports = ${
			JSON.stringify(Object.fromEntries(Object.keys(JSON.parse(code)).map(key => [key, 0])))
		});`;

		return {
			format: 'commonjs',
			source: inlineSourceMap(transformed),
		};
	}

	if (
		loaded.format === 'json'
		|| tsExtensionsPattern.test(url)
	) {
		const transformed = await transform(
			code,
			filePath,
			{
				tsconfigRaw: (
					path.isAbsolute(filePath)
						? fileMatcher?.(filePath) as TransformOptions['tsconfigRaw']
						: undefined
				),
			},
		);

		return {
			format: 'module',
			source: inlineSourceMap(transformed),
		};
	}

	if (loaded.format === 'module') {
		const dynamicImportTransformed = transformDynamicImport(filePath, code);
		if (dynamicImportTransformed) {
			loaded.source = inlineSourceMap(dynamicImportTransformed);
		}
	}

	return loaded;
};

if (debugEnabled) {
	const originalLoad = load;
	load = async (
		url,
		context,
		nextLoad,
	) => {
		log('load', {
			url,
			context,
		});
		const result = await originalLoad(url, context, nextLoad);
		log('loaded', {
			url,
			result,
		});
		return result;
	};
}

export { load };
