import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import type { LoadHook, LoadHookSync } from 'node:module';
import { readFile } from 'node:fs/promises';
import type { TransformOptions } from 'esbuild';
import { isFileIncluded } from 'get-tsconfig';
import { transform, transformEsmSync, transformSync } from '../../utils/transform/index.js';
import { transformDynamicImport } from '../../utils/transform/transform-dynamic-import.js';
import { inlineSourceMap } from '../../source-map.js';
import { isFeatureSupported, importAttributes, esmLoadReadFile } from '../../utils/node-features.js';
import { isGlobalCjsLoaderActive } from '../../utils/cjs-loader-state.js';
import { parent } from '../../utils/ipc/client.js';
import type { Message } from '../types.js';
import { isJsonPattern, tsExtensionsPattern, fileUrlPrefix } from '../../utils/path-utils.js';
import { isESM } from '../../utils/es-module-lexer.js';
import { logEsm as log, debugEnabled } from '../../utils/debug.js';
import { getNamespace } from './utils.js';
import { data as defaultData, type Data } from './initialize.js';

const importAttributesProperty = (
	isFeatureSupported(importAttributes)
		? 'importAttributes'
		: 'importAssertions' as 'importAttributes'
);

const isCommonJsFormat = (
	format: string | null | undefined,
) => (
	format === 'commonjs'
	|| format === 'commonjs-typescript'
);

const isModuleTypeScriptFormat = (
	format: string | null | undefined,
) => (
	format === 'module-typescript'
	|| format === 'typescript'
);

const getTsconfigRaw = (
	filePath: string,
	hookData: Data,
) => (
	hookData.parsedTsconfig && isFileIncluded(hookData.parsedTsconfig, filePath)
		? hookData.parsedTsconfig.config as TransformOptions['tsconfigRaw']
		: undefined
);

type LoadResult = Awaited<ReturnType<LoadHook>> & {
	responseURL?: string;
	shouldBeReloadedByCJSLoader?: boolean;
};

const notifyLoad = (
	hookData: Data,
	url: string,
) => {
	const parsedUrl = new URL(url);
	parsedUrl.searchParams.delete('tsx-namespace');
	const cleanUrl = parsedUrl.toString();

	if (hookData.port) {
		hookData.port.postMessage({
			type: 'load',
			url: cleanUrl,
		} satisfies Message);
	}

	hookData.onImport?.(cleanUrl);
};

const prepareLoad = (
	hookData: Data,
	url: string,
) => {
	if (!hookData.active) {
		return false;
	}

	const urlNamespace = getNamespace(url);
	if (hookData.namespace && hookData.namespace !== urlNamespace) {
		return false;
	}

	notifyLoad(hookData, url);

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

	return true;
};

const prepareJsonAttributes = (
	url: string,
	context: Parameters<LoadHook>[1],
) => {
	if (!isJsonPattern.test(url)) {
		return context;
	}

	const contextAttributes = context[importAttributesProperty];
	if (contextAttributes?.type) {
		return context;
	}

	return {
		...context,
		[importAttributesProperty]: {
			...contextAttributes,
			type: 'json',
		},
	};
};

const isCommonJsRequireContext = (
	context: Parameters<LoadHook>[1],
) => (
	context.conditions.includes('require')
	&& !context.conditions.includes('import')
);

export const createLoad = (
	hookData: Data,
): LoadHook => {
	const load: LoadHook = async (
		url,
		context,
		nextLoad,
	) => {
		if (!prepareLoad(hookData, url)) {
			return nextLoad(url, context);
		}

		const urlNamespace = getNamespace(url);
		const loadContext = prepareJsonAttributes(url, context);

		const loaded = await nextLoad(url, loadContext) as LoadResult;
		log(3, 'loaded by next loader', {
			url,
			loaded,
		});

		const filePath = url.startsWith(fileUrlPrefix) ? fileURLToPath(url) : url;
		const loadedFormat = loaded.format as string | undefined;

		if (
			isCommonJsFormat(loadedFormat)
			&& isFeatureSupported(esmLoadReadFile)
			&& loaded.responseURL?.startsWith('file:') // Could be data:
			&& !filePath.endsWith('.cjs') // CJS syntax doesn't need to be transformed for interop
		) {
			const code = await readFile(new URL(url), 'utf8');

			// if the file extension is .js, only transform if using esm syntax
			if (loadedFormat === 'commonjs-typescript' || !filePath.endsWith('.js') || isESM(code)) {
				/**
				 * es or cjs module lexer unfortunately cannot be used because it doesn't support
				 * typescript syntax
				 *
				 * In the normal CJS annotation path, only the exports are used for parsing.
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
						tsconfigRaw: getTsconfigRaw(filePath, hookData),
					},
				);

				const filePathWithNamespace = urlNamespace ? `${filePath}?namespace=${encodeURIComponent(urlNamespace)}` : filePath;

				loaded.format = 'commonjs';
				if (loadedFormat === 'commonjs-typescript' || filePath.endsWith('.cts')) {
					// Avoid Node's strip-only TypeScript CJS loader for syntax esbuild supports.
					loaded.source = inlineSourceMap(transformed);
				}
				loaded.responseURL = `data:text/javascript,${encodeURIComponent(transformed.code)}?filePath=${encodeURIComponent(filePathWithNamespace)}`;

				log(3, 'returning CJS export annotation', loaded);
				return loaded;
			}
		}

		// CommonJS and Internal modules (e.g. node:*)
		if (!loaded.source) {
			return loaded;
		}

		const code = loaded.source.toString();

		if (loadedFormat === 'commonjs-typescript') {
			const transformed = transformSync(
				code,
				filePath,
				{
					tsconfigRaw: getTsconfigRaw(filePath, hookData),
				},
			);

			return {
				...loaded,
				format: 'commonjs',
				source: inlineSourceMap(transformed),
			};
		}

		if (
			// Support named imports in JSON modules
			loaded.format === 'json'
			|| isModuleTypeScriptFormat(loadedFormat)
			|| tsExtensionsPattern.test(url)
		) {
			const transformed = await transform(
				code,
				filePath,
				{
					tsconfigRaw: getTsconfigRaw(filePath, hookData),
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

	if (!debugEnabled) {
		return load;
	}

	return async (
		url,
		context,
		nextLoad,
	) => {
		log(2, 'load', {
			url,
			context,
		});
		const result = await load(url, context, nextLoad);
		log(1, 'loaded', {
			url,
			result,
		});
		return result;
	};
};

export const createLoadSync = (
	hookData: Data,
): LoadHookSync => {
	const load: LoadHookSync = (
		url,
		context,
		nextLoad,
	) => {
		if (
			isCommonJsRequireContext(context)
			&& isGlobalCjsLoaderActive()
		) {
			return nextLoad(url, context);
		}

		if (!prepareLoad(hookData, url)) {
			return nextLoad(url, context);
		}

		const urlNamespace = getNamespace(url);
		const loadContext = prepareJsonAttributes(url, context);

		const loaded = nextLoad(url, loadContext) as LoadResult;
		log(3, 'loaded by next loader', {
			url,
			loaded,
		});

		const filePath = url.startsWith(fileUrlPrefix) ? fileURLToPath(url) : url;
		const loadedFormat = loaded.format as string | undefined;

		if (
			isCommonJsFormat(loadedFormat)
			&& isFeatureSupported(esmLoadReadFile)
			&& loaded.responseURL?.startsWith('file:') // Could be data:
			&& !filePath.endsWith('.cjs') // CJS syntax doesn't need to be transformed for interop
		) {
			const code = readFileSync(new URL(url), 'utf8');

			// if the file extension is .js, only transform if using esm syntax
			if (loadedFormat === 'commonjs-typescript' || !filePath.endsWith('.js') || isESM(code)) {
				const transformed = transformSync(
					code,
					filePath,
					{
						tsconfigRaw: getTsconfigRaw(filePath, hookData),
					},
				);

				const filePathWithNamespace = urlNamespace ? `${filePath}?namespace=${encodeURIComponent(urlNamespace)}` : filePath;
				// Node only preserves CJS globals/cache when it re-enters Module._load,
				// and skips module hooks on that path.
				// https://github.com/nodejs/node/blob/v26.1.0/lib/internal/modules/esm/translators.js#L335-L352
				const shouldReloadByCJSLoader = !urlNamespace && isGlobalCjsLoaderActive();

				loaded.format = 'commonjs';
				loaded.shouldBeReloadedByCJSLoader = shouldReloadByCJSLoader;
				// Avoid Node's strip-only TypeScript CJS loader for syntax esbuild supports.
				loaded.source = inlineSourceMap(transformed);
				if (!shouldReloadByCJSLoader) {
					loaded.responseURL = `data:text/javascript,${encodeURIComponent(transformed.code)}?filePath=${encodeURIComponent(filePathWithNamespace)}`;
				}

				log(3, 'returning CJS export annotation', loaded);
				return loaded;
			}
		}

		// CommonJS and Internal modules (e.g. node:*)
		if (!loaded.source) {
			return loaded;
		}

		const code = loaded.source.toString();

		if (loadedFormat === 'commonjs-typescript') {
			const transformed = transformSync(
				code,
				filePath,
				{
					tsconfigRaw: getTsconfigRaw(filePath, hookData),
				},
			);

			return {
				...loaded,
				format: 'commonjs',
				shouldBeReloadedByCJSLoader: false,
				source: inlineSourceMap(transformed),
			};
		}

		if (
			// Support named imports in JSON modules
			loaded.format === 'json'
			|| isModuleTypeScriptFormat(loadedFormat)
			|| tsExtensionsPattern.test(url)
		) {
			const transformed = transformEsmSync(
				code,
				filePath,
				{
					tsconfigRaw: getTsconfigRaw(filePath, hookData),
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

	if (!debugEnabled) {
		return load;
	}

	return (
		url,
		context,
		nextLoad,
	) => {
		log(2, 'loadSync', {
			url,
			context,
		});
		const result = load(url, context, nextLoad);
		log(1, 'loadedSync', {
			url,
			result,
		});
		return result;
	};
};

export const load = createLoad(defaultData);
