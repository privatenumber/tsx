import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { LoadHook } from 'node:module';
import { readFile } from 'node:fs/promises';
import type { TransformOptions } from 'esbuild';
import { transform, transformSync } from '../../utils/transform/index.js';
import { transformDynamicImport } from '../../utils/transform/transform-dynamic-import.js';
import { inlineSourceMap } from '../../source-map.js';
import { isFeatureSupported, importAttributes, esmLoadReadFile } from '../../utils/node-features.js';
import { parent } from '../../utils/ipc/client.js';
import type { Message } from '../types.js';
import { fileMatcher } from '../../utils/tsconfig.js';
import { isJsonPattern, tsExtensionsPattern, fileUrlPrefix } from '../../utils/path-utils.js';
import { isESM } from '../../utils/es-module-lexer.js';
import { logEsm as log, debugEnabled } from '../../utils/debug.js';
import { getNamespace } from './utils.js';
import { data } from './initialize.js';

const contextAttributesProperty = (
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

	if (isJsonPattern.test(url)) {
		let contextAttributes = context[contextAttributesProperty];
		if (!contextAttributes) {
			contextAttributes = {};
			context[contextAttributesProperty] = contextAttributes;
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

	const filePath = url.startsWith(fileUrlPrefix) ? fileURLToPath(url) : url;

	if (
		loaded.format === 'commonjs'
		&& isFeatureSupported(esmLoadReadFile)
		&& loaded.responseURL?.startsWith('file:') // Could be data:
		&& !filePath.endsWith('.cjs') // CJS syntax doesn't need to be transformed for interop
	) {
		const code = await readFile(new URL(url), 'utf8');

		// if the file extension is .js, only transform if using esm syntax
		if (!filePath.endsWith('.js') || isESM(code)) {
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
				filePath,
				{
					tsconfigRaw: fileMatcher?.(filePath) as TransformOptions['tsconfigRaw'],
				},
			);

			const filePathWithNamespace = urlNamespace ? `${filePath}?namespace=${encodeURIComponent(urlNamespace)}` : filePath;

			loaded.responseURL = `data:text/javascript,${encodeURIComponent(transformed.code)}?filePath=${encodeURIComponent(filePathWithNamespace)}`;

			log('returning CJS export annotation', loaded);
			return loaded;
		}
	}

	// CommonJS and Internal modules (e.g. node:*)
	if (!loaded.source) {
		return loaded;
	}

	const code = loaded.source.toString();

	if (
		// Support named imports in JSON modules
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
