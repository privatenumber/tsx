import { fileURLToPath } from 'node:url';
import type { LoadHook } from 'node:module';
import { readFile } from 'node:fs/promises';
import type { TransformOptions } from 'esbuild';
import { transform } from '../../utils/transform/index.js';
import { transformDynamicImport } from '../../utils/transform/transform-dynamic-import.js';
import { inlineSourceMap } from '../../source-map.js';
import { isFeatureSupported, importAttributes, esmLoadReadFile } from '../../utils/node-features.js';
import { parent } from '../../utils/ipc/client.js';
import type { Message } from '../types.js';
import { fileMatcher } from '../../utils/tsconfig.js';
import { isJsonPattern, tsExtensionsPattern } from '../../utils/path-utils.js';
import { parseEsm } from '../../utils/es-module-lexer.js';
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
		if (!context[contextAttributesProperty]) {
			context[contextAttributesProperty] = {};
		}

		context[contextAttributesProperty]!.type = 'json';
	}

	const loaded = await nextLoad(url, context);
	const filePath = url.startsWith('file://') ? fileURLToPath(url) : url;

	if (
		loaded.format === 'commonjs'
		&& isFeatureSupported(esmLoadReadFile)
		&& loaded.responseURL?.startsWith('file:') // Could be data:
	) {
		const code = await readFile(new URL(url), 'utf8');
		const [, exports] = parseEsm(code);
		if (exports.length > 0) {
			const cjsExports = `module.exports={${
				exports.map(exported => exported.n).filter(name => name !== 'default').join(',')
			}}`;
			const parameters = new URLSearchParams({ filePath });
			if (urlNamespace) {
				parameters.set('namespace', urlNamespace);
			}
			loaded.responseURL = `data:text/javascript,${encodeURIComponent(cjsExports)}?${parameters.toString()}`;
		}

		return loaded;
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
