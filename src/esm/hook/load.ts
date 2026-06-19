import { fileURLToPath, pathToFileURL } from 'node:url';
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
import {
	isJsonPattern,
	tsExtensionsPattern,
	fileUrlPrefix,
	implicitTsExtensionsPattern,
} from '../../utils/path-utils.js';
import { isESM } from '../../utils/es-module-lexer.js';
import { logEsm as log, debugEnabled } from '../../utils/debug.js';
import {
	commonJsExportPreparseSearchParameter,
	commonJsVirtualQuerySearchParameter,
	getSearchWithoutParameters,
	getQueryWithoutParameters,
	namespaceQuery,
	getNamespace,
	moduleSourceByUrl,
} from './utils.js';
import type { Data } from './initialize.js';

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

const supportsEsmLoadReadFile = isFeatureSupported(esmLoadReadFile);

const commonJsVirtualQueryParameters = [`${commonJsVirtualQuerySearchParameter}=`];

const commonJsInternalQueryParameters = [
	`${commonJsExportPreparseSearchParameter}=`,
	`${commonJsVirtualQuerySearchParameter}=`,
];

const getTsconfigRaw = (
	filePath: string,
	hookData: Data,
) => (
	hookData.parsedTsconfig && isFileIncluded(hookData.parsedTsconfig, filePath)
		? hookData.parsedTsconfig.config as TransformOptions['tsconfigRaw']
		: undefined
);

const getFilePathFromVirtualQuery = (
	fileUrl: URL,
) => {
	if (!fileUrl.searchParams.has(commonJsVirtualQuerySearchParameter)) {
		return;
	}

	const { pathname } = fileUrl;
	const queryIndex = pathname.toLowerCase().lastIndexOf('%3f');
	if (queryIndex === -1) {
		return;
	}

	const cleanFileUrl = new URL(fileUrl);
	cleanFileUrl.pathname = pathname.slice(0, queryIndex);
	cleanFileUrl.search = '';
	return fileURLToPath(cleanFileUrl);
};

const getFileLoadContext = (
	url: string,
) => {
	const fileUrl = url.startsWith(fileUrlPrefix) ? new URL(url) : undefined;
	const rawFilePath = fileUrl ? fileURLToPath(fileUrl) : url;
	const virtualFilePath = fileUrl && getFilePathFromVirtualQuery(fileUrl);
	const filePath = virtualFilePath || rawFilePath;
	const loadUrl = (
		fileUrl && virtualFilePath
			? (
				pathToFileURL(filePath).toString()
				+ getSearchWithoutParameters(fileUrl.search, commonJsVirtualQueryParameters)
			)
			: url
	);

	return {
		fileUrl,
		filePath,
		loadUrl,
	};
};

const getTransformPath = (
	filePath: string,
	fileUrl: URL | undefined,
) => {
	if (!fileUrl?.search) {
		return filePath;
	}

	const search = getSearchWithoutParameters(fileUrl.search, commonJsInternalQueryParameters);
	return search ? pathToFileURL(filePath).toString() + search : filePath;
};

const getFilePathWithQuery = (
	filePath: string,
	fileUrl: URL | undefined,
	urlNamespace: string | undefined,
) => {
	const query = [
		...(
			fileUrl
				? getQueryWithoutParameters(fileUrl.search, [
					namespaceQuery,
					...commonJsInternalQueryParameters,
				]).split('&').filter(Boolean)
				: []
		),
		...(
			urlNamespace
				? [`namespace=${encodeURIComponent(urlNamespace)}`]
				: []
		),
	].join('&');

	return query ? `${filePath}?${query}` : filePath;
};

type LoadResult = Awaited<ReturnType<LoadHook>> & {
	responseURL?: string;
	shouldBeReloadedByCJSLoader?: boolean;
};

// nextLoad() can return ArrayBuffer/TypedArray source; Node decodes text
// formats after the hook chain, but tsx transforms before returning.
// https://github.com/nodejs/node/pull/55698
// https://github.com/nodejs/node/blob/v26.0.0/lib/internal/modules/customization_hooks.js#L374-L390
const textDecoder = new TextDecoder();

const decodeSource = (
	source: NonNullable<LoadResult['source']>,
) => (
	typeof source === 'string'
		? source
		: textDecoder.decode(source)
);

const notifyLoad = (
	hookData: Data,
	url: string,
) => {
	const parsedUrl = new URL(url);
	const filePath = url.startsWith(fileUrlPrefix)
		? getFileLoadContext(url).filePath
		: undefined;
	parsedUrl.searchParams.delete('tsx-namespace');
	parsedUrl.searchParams.delete(commonJsExportPreparseSearchParameter);
	parsedUrl.searchParams.delete(commonJsVirtualQuerySearchParameter);
	if (filePath) {
		parsedUrl.pathname = new URL(pathToFileURL(filePath)).pathname;
	}
	const cleanUrl = parsedUrl.toString();

	if (hookData.port) {
		hookData.port.postMessage({
			type: 'load',
			url: cleanUrl,
		} satisfies Message);
	}

	hookData.onImport?.(cleanUrl);

	return cleanUrl;
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

	const cleanUrl = notifyLoad(hookData, url);

	/*
	Filter out node:*
	Maybe only handle files that start with file://
	*/
	if (parent.send) {
		parent.send({
			type: 'dependency',
			path: cleanUrl,
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
	{ conditions }: Parameters<LoadHook>[1],
) => (
	conditions?.includes('require') === true
	&& !conditions.includes('import')
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
		const { fileUrl, filePath, loadUrl } = getFileLoadContext(url);
		const loadContext = prepareJsonAttributes(loadUrl, context);

		const loaded = await nextLoad(loadUrl, loadContext) as LoadResult;
		log(3, 'loaded by next loader', {
			url,
			loadUrl,
			loaded,
		});

		const shouldPreparseCommonJsExports = (
			fileUrl?.searchParams.has(commonJsExportPreparseSearchParameter) === true
		);
		const loadedFormat = loaded.format as string | undefined;
		const cleanImportMetaUrl = fileUrl ? new URL(pathToFileURL(filePath)) : undefined;
		if (cleanImportMetaUrl && fileUrl) {
			cleanImportMetaUrl.search = getSearchWithoutParameters(
				fileUrl.search,
				commonJsInternalQueryParameters,
			);
		}

		if (
			isCommonJsFormat(loadedFormat)
			&& fileUrl
			&& loaded.responseURL?.startsWith('file:') // Could be data:
			&& !filePath.endsWith('.cjs') // CJS syntax doesn't need to be transformed for interop
		) {
			const code = await readFile(pathToFileURL(filePath), 'utf8');
			const hasEsmSyntax = isESM(code);

			// if the file extension is .js, only transform if using esm syntax
			if (loadedFormat === 'commonjs-typescript' || !filePath.endsWith('.js') || hasEsmSyntax) {
				if (!supportsEsmLoadReadFile) {
					if (
						shouldPreparseCommonJsExports
						&& hasEsmSyntax
						&& implicitTsExtensionsPattern.test(filePath)
					) {
						// Entries keep CommonJS package semantics; only imports marked in resolve
						// fall back to ESM so Node can see their named exports.
						const transformed = await transform(
							code,
							filePath,
							{
								define: {
									'import.meta.url': JSON.stringify(cleanImportMetaUrl!.toString()),
								},
								tsconfigRaw: getTsconfigRaw(filePath, hookData),
							},
						);
						moduleSourceByUrl.set(url, transformed.code);

						return {
							format: 'module',
							source: inlineSourceMap(transformed),
						};
					}

					return loaded;
				}

				if (!urlNamespace && !shouldPreparseCommonJsExports && !filePath.endsWith('.cts')) {
					return loaded;
				}

				/**
				 * es-module-lexer/cjs-module-lexer can't parse TypeScript syntax.
				 * Transform first so Node can preparse esbuild's CJS export annotation
				 * and evaluate the same source from the original file URL.
				 *
				 * Returning only an export annotation would be smaller, but that only
				 * works for ESM->CJS output. CTS files are already CJS, so module.exports
				 * can be written in any pattern.
				 */
				const shouldUseDataResponseUrl = Boolean(
					urlNamespace
					|| shouldPreparseCommonJsExports
					|| getSearchWithoutParameters(fileUrl.search, commonJsInternalQueryParameters),
				);
				const transformed = transformSync(
					code,
					getTransformPath(filePath, fileUrl),
					{
						cjsBanner: (
							shouldUseDataResponseUrl
								? `require = require("node:module").createRequire(${JSON.stringify(pathToFileURL(filePath).toString())});`
								: undefined
						),
						tsconfigRaw: getTsconfigRaw(filePath, hookData),
					},
				);

				loaded.format = 'commonjs';
				loaded.source = inlineSourceMap(transformed);
				if (shouldUseDataResponseUrl) {
					const filePathWithQuery = getFilePathWithQuery(filePath, fileUrl, urlNamespace);
					loaded.responseURL = `data:text/javascript,${encodeURIComponent(transformed.code)}?filePath=${encodeURIComponent(filePathWithQuery)}`;
				}

				log(3, 'returning CJS export annotation', loaded);
				return loaded;
			}
		}

		// CommonJS and Internal modules (e.g. node:*)
		if (!loaded.source) {
			return loaded;
		}

		const code = decodeSource(loaded.source);
		// CJS JSON require still parses hook source as JSON after module hooks.
		// https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1969-L1978
		const shouldTransformJson = loadedFormat === 'json' && !isCommonJsRequireContext(context);

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
			shouldTransformJson
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
			moduleSourceByUrl.set(url, transformed.code);

			return {
				format: 'module',
				source: inlineSourceMap(transformed),
			};
		}

		if (loaded.format === 'module') {
			const dynamicImportTransformed = transformDynamicImport(filePath, code);
			if (dynamicImportTransformed) {
				loaded.source = inlineSourceMap(dynamicImportTransformed);
				moduleSourceByUrl.set(url, dynamicImportTransformed.code);
			} else {
				moduleSourceByUrl.set(url, code);
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
		const { fileUrl, filePath, loadUrl } = getFileLoadContext(url);
		const loadContext = prepareJsonAttributes(loadUrl, context);

		const loaded = nextLoad(loadUrl, loadContext) as LoadResult;
		log(3, 'loaded by next loader', {
			url,
			loadUrl,
			loaded,
		});

		const loadedFormat = loaded.format as string | undefined;

		if (
			isCommonJsFormat(loadedFormat)
			&& isFeatureSupported(esmLoadReadFile)
			&& loaded.responseURL?.startsWith('file:') // Could be data:
			&& !filePath.endsWith('.cjs') // CJS syntax doesn't need to be transformed for interop
		) {
			const code = readFileSync(pathToFileURL(filePath), 'utf8');

			// if the file extension is .js, only transform if using esm syntax
			if (loadedFormat === 'commonjs-typescript' || !filePath.endsWith('.js') || isESM(code)) {
				const transformed = transformSync(
					code,
					getTransformPath(filePath, fileUrl),
					{
						tsconfigRaw: getTsconfigRaw(filePath, hookData),
					},
				);

				// Node only preserves CJS globals/cache when it re-enters Module._load,
				// and skips module hooks on that path.
				// https://github.com/nodejs/node/blob/v26.1.0/lib/internal/modules/esm/translators.js#L335-L352
				const shouldReloadByCJSLoader = !urlNamespace && isGlobalCjsLoaderActive();
				const filePathWithQuery = getFilePathWithQuery(filePath, fileUrl, urlNamespace);

				loaded.format = 'commonjs';
				loaded.shouldBeReloadedByCJSLoader = shouldReloadByCJSLoader;
				// Avoid Node's strip-only TypeScript CJS loader for syntax esbuild supports.
				loaded.source = inlineSourceMap(transformed);
				if (!shouldReloadByCJSLoader) {
					loaded.responseURL = `data:text/javascript,${encodeURIComponent(transformed.code)}?filePath=${encodeURIComponent(filePathWithQuery)}`;
				}

				log(3, 'returning CJS export annotation', loaded);
				return loaded;
			}
		}

		// CommonJS and Internal modules (e.g. node:*)
		if (!loaded.source) {
			return loaded;
		}

		const code = decodeSource(loaded.source);
		// CJS JSON require still parses hook source as JSON after module hooks.
		// https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1969-L1978
		const shouldTransformJson = loadedFormat === 'json' && !isCommonJsRequireContext(context);

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
			shouldTransformJson
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
