import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
	ResolveHook,
	ResolveHookContext,
} from 'node:module';
import type { PackageJson } from 'type-fest';
import { readJsonFile } from '../../utils/read-json-file.js';
import { mapTsExtensions } from '../../utils/map-ts-extensions.js';
import type { NodeError } from '../../types.js';
import { tsconfigPathsMatcher, allowJs } from '../../utils/tsconfig.js';
import {
	requestAcceptsQuery,
	fileUrlPrefix,
	tsExtensionsPattern,
	isDirectoryPattern,
	isRelativePath,
} from '../../utils/path-utils.js';
import type { TsxRequest } from '../types.js';
import { logEsm as log, debugEnabled } from '../../utils/debug.js';
import {
	getFormatFromFileUrl,
	namespaceQuery,
	getNamespace,
} from './utils.js';
import { data } from './initialize.js';

type NextResolve = Parameters<ResolveHook>[2];

const getMissingPathFromNotFound = (
	nodeError: NodeError,
) => {
	if (nodeError.url) {
		return nodeError.url;
	}

	const isExportPath = nodeError.message.match(/^Cannot find module '([^']+)'/);
	if (isExportPath) {
		const [, exportPath] = isExportPath;
		return exportPath;
	}

	const isPackagePath = nodeError.message.match(/^Cannot find package '([^']+)'/);
	if (isPackagePath) {
		const [, packagePath] = isPackagePath;
		if (!path.isAbsolute(packagePath)) {
			return;
		}

		const packageUrl = pathToFileURL(packagePath);

		// Node v20.0.0 logs the package directory
		// Slash check / works on Windows as well because it's a path URL
		if (packageUrl.pathname.endsWith('/')) {
			packageUrl.pathname += 'package.json';
		}

		// Node v21+ logs the package package.json path
		if (packageUrl.pathname.endsWith('/package.json')) {
			// packageJsonUrl.pathname += '/package.json';
			const packageJson = readJsonFile<PackageJson>(packageUrl);
			if (packageJson?.main) {
				return new URL(packageJson.main, packageUrl).toString();
			}
		} else {
			// Node v22.6.0 logs the entry path so we don't need to look it up from package.json
			return packageUrl.toString();
		}
	}
};

const resolveExtensions = async (
	url: string,
	context: ResolveHookContext,
	nextResolve: NextResolve,
	throwError?: boolean,
) => {
	const tryPaths = mapTsExtensions(url);
	log(3, 'resolveExtensions', {
		url,
		context,
		throwError,
		tryPaths,
	});
	if (!tryPaths) {
		return;
	}

	let caughtError: unknown;
	for (const tsPath of tryPaths) {
		try {
			return await nextResolve(tsPath, context);
		} catch (error) {
			const { code } = error as NodeError;
			if (
				code !== 'ERR_MODULE_NOT_FOUND'
				&& code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED'
			) {
				throw error;
			}

			caughtError = error;
		}
	}

	if (throwError) {
		throw caughtError;
	}
};

const resolveBase: ResolveHook = async (
	specifier,
	context,
	nextResolve,
) => {
	log(3, 'resolveBase', {
		specifier,
		context,
		specifierStartsWithFileUrl: specifier.startsWith(fileUrlPrefix),
		isRelativePath: isRelativePath(specifier),
		tsExtensionsPattern: tsExtensionsPattern.test(context.parentURL!),
		allowJs,
	});

	/**
	 * Only prioritize TypeScript extensions for file paths (no dependencies)
	 * TS aliases are pre-resolved so they're file paths
	 *
	 * If `allowJs` is set in `tsconfig.json`, then we'll apply the same resolution logic
	 * to files without a TypeScript extension.
	 */
	if (
		(
			specifier.startsWith(fileUrlPrefix)
			|| isRelativePath(specifier)
		) && (
			tsExtensionsPattern.test(context.parentURL!)
			|| allowJs
		)
	) {
		const resolved = await resolveExtensions(specifier, context, nextResolve);
		log(3, 'resolveBase resolved', {
			specifier,
			context,
			resolved,
		});
		if (resolved) {
			return resolved;
		}
	}

	try {
		return await nextResolve(specifier, context);
	} catch (error) {
		log(3, 'resolveBase error', {
			specifier,
			context,
			error,
		});
		if (error instanceof Error) {
			const nodeError = error as NodeError;
			if (nodeError.code === 'ERR_MODULE_NOT_FOUND') {
				// Resolving .js -> .ts in exports/imports map
				const errorPath = getMissingPathFromNotFound(nodeError);
				if (errorPath) {
					const resolved = await resolveExtensions(errorPath, context, nextResolve);
					if (resolved) {
						return resolved;
					}
				}
			}
		}

		throw error;
	}
};

const resolveDirectory: ResolveHook = async (
	specifier,
	context,
	nextResolve,
) => {
	log(3, 'resolveDirectory', {
		specifier,
		context,
		isDirectory: isDirectoryPattern.test(specifier),
	});
	if (specifier === '.' || specifier === '..' || specifier.endsWith('/..')) {
		specifier += '/';
	}

	if (isDirectoryPattern.test(specifier)) {
		const urlParsed = new URL(specifier, context.parentURL);

		// If directory, can be index.js, index.ts, etc.
		urlParsed.pathname = path.join(urlParsed.pathname, 'index');

		return (await resolveExtensions(
			urlParsed.toString(),
			context,
			nextResolve,
			true,
		))!;
	}

	try {
		return await resolveBase(specifier, context, nextResolve);
	} catch (error) {
		if (error instanceof Error) {
			log(3, 'resolveDirectory error', {
				specifier,
				context,
				error,
			});
			const nodeError = error as NodeError;
			if (nodeError.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
				const errorPath = getMissingPathFromNotFound(nodeError);
				if (errorPath) {
					try {
						return (await resolveExtensions(
							`${errorPath}/index`,
							context,
							nextResolve,
							true,
						))!;
					} catch (_error) {
						const __error = _error as Error;
						const { message } = __error;
						__error.message = __error.message.replace(`${'/index'.replace('/', path.sep)}'`, "'");
						__error.stack = __error.stack!.replace(message, __error.message);
						throw __error;
					}
				}
			}
		}

		throw error;
	}
};

const resolveTsPaths: ResolveHook = async (
	specifier,
	context,
	nextResolve,
) => {
	log(3, 'resolveTsPaths', {
		specifier,
		context,

		requestAcceptsQuery: requestAcceptsQuery(specifier),
		tsconfigPathsMatcher,
		fromNodeModules: context.parentURL?.includes('/node_modules/'),
	});
	if (
		// Bare specifier
		!requestAcceptsQuery(specifier)
		// TS path alias
		&& tsconfigPathsMatcher
		&& !context.parentURL?.includes('/node_modules/')
	) {
		const possiblePaths = tsconfigPathsMatcher(specifier);
		log(3, 'resolveTsPaths', {
			possiblePaths,
		});
		for (const possiblePath of possiblePaths) {
			try {
				return await resolveDirectory(
					pathToFileURL(possiblePath).toString(),
					context,
					nextResolve,
				);
			} catch {}
		}
	}

	return resolveDirectory(specifier, context, nextResolve);
};

const tsxProtocol = 'tsx://';

// eslint-disable-next-line import-x/no-mutable-exports
let resolve: ResolveHook = async (
	specifier,
	context,
	nextResolve,
) => {
	if (!data.active || specifier.startsWith('node:')) {
		return nextResolve(specifier, context);
	}

	let requestNamespace = getNamespace(specifier) ?? (
		// Inherit namespace from parent
		context.parentURL && getNamespace(context.parentURL)
	);

	if (data.namespace) {
		let tsImportRequest: TsxRequest | undefined;

		// Initial request from tsImport()
		if (specifier.startsWith(tsxProtocol)) {
			try {
				tsImportRequest = JSON.parse(specifier.slice(tsxProtocol.length));
			} catch {}

			if (tsImportRequest?.namespace) {
				requestNamespace = tsImportRequest.namespace;
			}
		}

		if (data.namespace !== requestNamespace) {
			return nextResolve(specifier, context);
		}

		if (tsImportRequest) {
			specifier = tsImportRequest.specifier;
			context.parentURL = tsImportRequest.parentURL;
		}
	}

	const [cleanSpecifier, query] = specifier.split('?');

	const resolved = await resolveTsPaths(
		cleanSpecifier,
		context,
		nextResolve,
	);

	log(2, 'nextResolve', {
		resolved,
	});

	if (resolved.format === 'builtin') {
		return resolved;
	}

	// For TypeScript extensions that Node can't detect the format of
	if (
		(
			!resolved.format
			|| resolved.format === 'commonjs-typescript'
			|| resolved.format === 'module-typescript'
		)
		// Filter out data: (sourcemaps)
		&& resolved.url.startsWith(fileUrlPrefix)
	) {
		resolved.format = await getFormatFromFileUrl(resolved.url);
		log(2, 'getFormatFromFileUrl', {
			resolved,
			format: resolved.format,
		});
	}

	if (query) {
		resolved.url += `?${query}`;
	}

	// Inherit namespace
	// Skip data URLs as they cannot properly handle query parameters
	if (
		requestNamespace
		&& !resolved.url.includes(namespaceQuery)
		&& !resolved.url.startsWith('data:')
	) {
		resolved.url += (resolved.url.includes('?') ? '&' : '?') + namespaceQuery + requestNamespace;
	}

	return resolved;
};

if (debugEnabled) {
	const originalResolve = resolve;
	resolve = async (
		specifier,
		context,
		nextResolve,
	) => {
		log(2, 'resolve', {
			specifier,
			context,
		});
		const result = await originalResolve(specifier, context, nextResolve);
		log(1, 'resolved', {
			specifier,
			context,
			result,
		});
		return result;
	};
}

export { resolve };
