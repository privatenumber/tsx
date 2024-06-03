import { fileURLToPath } from 'node:url';
import type { LoadHook } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { TransformOptions } from 'esbuild';
import { transform } from '../../utils/transform/index.js';
import { transformDynamicImport } from '../../utils/transform/transform-dynamic-import.js';
import { inlineSourceMap } from '../../source-map.js';
import { isFeatureSupported, importAttributes, esmLoadReadFile } from '../../utils/node-features.js';
import { parent } from '../../utils/ipc/client.js';
import type { Message } from '../types.js';
import { fileMatcher } from '../../utils/tsconfig.js';
import { isJsonPattern, tsExtensionsPattern } from '../../utils/path-utils.js';
import { getNamespace } from './utils.js';
import { data } from './initialize.js';
import { log } from '../../utils/debug.js';

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

	if (data.namespace && data.namespace !== getNamespace(url)) {
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
		if (!context[contextAttributesProperty]) {
			context[contextAttributesProperty] = {};
		}

		context[contextAttributesProperty]!.type = 'json';
	}

	const loaded = await nextLoad(url, context);

	if (loaded.format === 'commonjs' && isFeatureSupported(esmLoadReadFile)) {
		const code = await readFile(new URL(loaded.responseURL), 'utf8');
		const filePath = fileURLToPath(loaded.responseURL);
		const transformed = await transform(
			code,
			loaded.responseURL,
			{
				format: 'cjs',
				platform: 'node',
				tsconfigRaw: fileMatcher?.(filePath) as TransformOptions['tsconfigRaw'],
			},
		);
		loaded.responseURL = `data:text/javascript,${encodeURIComponent(transformed.code)}?tsx-file=${encodeURIComponent(filePath)}`;
		return loaded;
	}

	// CommonJS and Internal modules (e.g. node:*)
	if (!loaded.source) {
		return loaded;
	}

	const filePath = url.startsWith('file://') ? fileURLToPath(url) : url;
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
				tsconfigRaw: fileMatcher?.(filePath) as TransformOptions['tsconfigRaw'],
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
