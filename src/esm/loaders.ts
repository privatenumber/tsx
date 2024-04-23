import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import type {
	ResolveFnOutput, ResolveHookContext, LoadHook, GlobalPreloadHook, InitializeHook,
} from 'module';
import type { TransformOptions } from 'esbuild';
import { transform } from '../utils/transform/index.js';
import { transformDynamicImport } from '../utils/transform/transform-dynamic-import.js';
import { resolveTsPath } from '../utils/resolve-ts-path.js';
import { installSourceMapSupport } from '../source-map.js';
import { isFeatureSupported, importAttributes } from '../utils/node-features.js';
import { connectingToServer, type SendToParent } from '../utils/ipc/client.js';
import {
	tsconfigPathsMatcher,
	fileMatcher,
	tsExtensionsPattern,
	isJsonPattern,
	getFormatFromFileUrl,
	fileProtocol,
	allowJs,
	type MaybePromise,
	type NodeError,
} from './utils.js';

const applySourceMap = installSourceMapSupport();

const isDirectoryPattern = /\/(?:$|\?)/;

type NextResolve = (
	specifier: string,
	context?: ResolveHookContext,
) => MaybePromise<ResolveFnOutput>;

type resolve = (
	specifier: string,
	context: ResolveHookContext,
	nextResolve: NextResolve,
	recursiveCall?: boolean,
) => MaybePromise<ResolveFnOutput>;

export const initialize: InitializeHook = async (data) => {
	if (!data) {
		throw new Error('tsx must be loaded with --import instead of --loader\nThe --loader flag was deprecated in Node v20.6.0 and v18.19.0');
	}
};

/**
 * Technically globalPreload is deprecated so it should be in loaders-deprecated
 * but it shares a closure with the new load hook
 */
export const globalPreload: GlobalPreloadHook = () => `
const require = getBuiltin('module').createRequire("${import.meta.url}");
require('../source-map.cjs').installSourceMapSupport();
`;

const resolveExplicitPath = async (
	defaultResolve: NextResolve,
	specifier: string,
	context: ResolveHookContext,
) => {
	const resolved = await defaultResolve(specifier, context);

	if (
		!resolved.format
		&& resolved.url.startsWith(fileProtocol)
	) {
		resolved.format = await getFormatFromFileUrl(resolved.url);
	}

	return resolved;
};

const extensions = ['.js', '.json', '.ts', '.tsx', '.jsx'] as const;

const tryExtensions = async (
	specifier: string,
	context: ResolveHookContext,
	defaultResolve: NextResolve,
) => {
	const [specifierWithoutQuery, query] = specifier.split('?');
	let throwError: Error | undefined;
	for (const extension of extensions) {
		try {
			return await resolveExplicitPath(
				defaultResolve,
				specifierWithoutQuery + extension + (query ? `?${query}` : ''),
				context,
			);
		} catch (_error) {
			if (
				throwError === undefined
				&& _error instanceof Error
			) {
				const { message } = _error;
				_error.message = _error.message.replace(`${extension}'`, "'");
				_error.stack = _error.stack!.replace(message, _error.message);
				throwError = _error;
			}
		}
	}

	throw throwError;
};

const tryDirectory = async (
	specifier: string,
	context: ResolveHookContext,
	defaultResolve: NextResolve,
) => {
	const isExplicitDirectory = isDirectoryPattern.test(specifier);
	const appendIndex = isExplicitDirectory ? 'index' : '/index';
	const [specifierWithoutQuery, query] = specifier.split('?');

	try {
		return await tryExtensions(
			specifierWithoutQuery + appendIndex + (query ? `?${query}` : ''),
			context,
			defaultResolve,
		);
	} catch (_error) {
		if (!isExplicitDirectory) {
			try {
				return await tryExtensions(specifier, context, defaultResolve);
			} catch {}
		}

		const error = _error as Error;
		const { message } = error;
		error.message = error.message.replace(`${appendIndex.replace('/', path.sep)}'`, "'");
		error.stack = error.stack!.replace(message, error.message);
		throw error;
	}
};

const isRelativePathPattern = /^\.{1,2}\//;

export const resolve: resolve = async (
	specifier,
	context,
	defaultResolve,
	recursiveCall,
) => {
	// If directory, can be index.js, index.ts, etc.
	if (isDirectoryPattern.test(specifier)) {
		return await tryDirectory(specifier, context, defaultResolve);
	}

	const isPath = (
		specifier.startsWith(fileProtocol)
		|| isRelativePathPattern.test(specifier)
	);

	if (
		tsconfigPathsMatcher
		&& !isPath // bare specifier
		&& !context.parentURL?.includes('/node_modules/')
	) {
		const possiblePaths = tsconfigPathsMatcher(specifier);
		for (const possiblePath of possiblePaths) {
			try {
				return await resolve(
					pathToFileURL(possiblePath).toString(),
					context,
					defaultResolve,
				);
			} catch {}
		}
	}

	// Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
	//
	// If `allowJs` is set in `tsconfig.json`, then we'll apply the same resolution logic
	// to files without a TypeScript extension.
	if (tsExtensionsPattern.test(context.parentURL!) || allowJs) {
		const tsPaths = resolveTsPath(specifier);
		if (tsPaths) {
			for (const tsPath of tsPaths) {
				try {
					return await resolveExplicitPath(defaultResolve, tsPath, context);
					// return await resolve(tsPath, context, defaultResolve, true);
				} catch (error) {
					const { code } = error as NodeError;
					if (
						code !== 'ERR_MODULE_NOT_FOUND'
						&& code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED'
					) {
						throw error;
					}
				}
			}
		}
	}

	try {
		return await resolveExplicitPath(defaultResolve, specifier, context);
	} catch (error) {
		if (
			error instanceof Error
			&& !recursiveCall
		) {
			const { code } = error as NodeError;
			if (code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
				try {
					return await tryDirectory(specifier, context, defaultResolve);
				} catch (error_) {
					if ((error_ as NodeError).code !== 'ERR_PACKAGE_IMPORT_NOT_DEFINED') {
						throw error_;
					}
				}
			}

			if (code === 'ERR_MODULE_NOT_FOUND') {
				try {
					return await tryExtensions(specifier, context, defaultResolve);
				} catch {}
			}
		}

		throw error;
	}
};

let sendToParent: SendToParent | void;
connectingToServer.then(
	(_sendToParent) => {
		sendToParent = _sendToParent;
	},
	() => {},
);

const contextAttributesProperty = (
	isFeatureSupported(importAttributes)
		? 'importAttributes'
		: 'importAssertions'
);

export const load: LoadHook = async (
	url,
	context,
	defaultLoad,
) => {
	/*
	Filter out node:*
	Maybe only handle files that start with file://
	*/
	if (sendToParent) {
		sendToParent({
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

	const loaded = await defaultLoad(url, context);

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
			source: applySourceMap(transformed),
		};
	}

	if (loaded.format === 'module') {
		const dynamicImportTransformed = transformDynamicImport(filePath, code);
		if (dynamicImportTransformed) {
			loaded.source = applySourceMap(dynamicImportTransformed);
		}
	}

	return loaded;
};
