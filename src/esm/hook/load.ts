import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { LoadHook, LoadHookContext } from 'node:module';
import { readFile } from 'node:fs/promises';
import type { TransformOptions } from 'esbuild';
import backend from '../../backend/index.js';
import { transformDynamicImport } from '../../utils/transform/transform-dynamic-import.js';
import { inlineSourceMap } from '../../source-map.js';
import { isFeatureSupported, importAttributes, esmLoadReadFile } from '../../utils/node-features.js';
import { parent } from '../../utils/ipc/client.js';
import type { Message } from '../types.js';
import { fileMatcher } from '../../utils/tsconfig.js';
import { isJsonPattern, tsExtensionsPattern, fileUrlPrefix } from '../../utils/path-utils.js';
import { isESM } from '../../utils/es-module-lexer.js';
import { getNamespace } from './utils.js';
import { data } from './initialize.js';

const contextAttributesProperty = (
	isFeatureSupported(importAttributes)
		? 'importAttributes'
		: 'importAssertions'
);

export const load: LoadHook = async (
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
		// @types/node only declares `importAttributes` type
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		context[contextAttributesProperty as keyof LoadHookContext] ||= {} as any;
		(context[contextAttributesProperty as keyof LoadHookContext] as ImportAttributes).type = 'json';
	}

	const loaded = await nextLoad(url, context);
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
			const transformed = backend.transformSync(
				code,
				filePath,
				{
					tsconfigRaw: fileMatcher?.(filePath) as TransformOptions['tsconfigRaw'],
				},
			);

			const filePathWithNamespace = urlNamespace ? `${filePath}?namespace=${encodeURIComponent(urlNamespace)}` : filePath;

			loaded.responseURL = `data:text/javascript,${encodeURIComponent(transformed.code)}?filePath=${encodeURIComponent(filePathWithNamespace)}`;
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
		const transformed = await backend.transform(
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
