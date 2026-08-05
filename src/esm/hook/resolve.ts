import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
	ResolveHook,
	ResolveHookContext,
	ResolveHookSync,
} from 'node:module';
import type { PackageJson } from 'type-fest';
import { resolvePathAlias } from 'get-tsconfig';
import { readJsonFile } from '../../utils/read-json-file.js';
import { getExtensionResolution } from '../../utils/extension-resolution.js';
import type { NodeError } from '../../types.js';
import {
	fileUrlPrefix,
	tsExtensionsPattern,
	implicitTsExtensionsPattern,
	isDirectoryPattern,
	isRelativePath,
	isFilePath,
	isDependencyPath,
} from '../../utils/path-utils.js';
import type { TsxRequest } from '../types.js';
import { isGlobalCjsLoaderActive } from '../../utils/cjs-loader-state.js';
import { esmLoadReadFile, isFeatureSupported } from '../../utils/node-features.js';
import { logEsm as log, debugEnabled } from '../../utils/debug.js';
import { getPackageSubpathDirectoryInfo } from './package-subpath.js';
import {
	getFormatFromFileUrl,
	getFormatFromFileUrlSync,
	namespaceQuery,
	commonJsExportPreparseQuery,
	commonJsExportPreparseSearchParameter,
	commonJsVirtualQuerySearchParameter,
	getQueryWithoutParameters,
	getNamespace,
	parentImportsCommonJsExports,
} from './utils.js';
import type { Data } from './initialize.js';

type NextResolve = Parameters<ResolveHook>[2];
type NextResolveSync = Parameters<ResolveHookSync>[2];

const supportsEsmLoadReadFile = isFeatureSupported(esmLoadReadFile);
const urlLikeSpecifierPattern = /^(?:[a-z][\d+.a-z-]*:\/\/|data:|file:|node:)/i;

const isTsconfigPathAliasSpecifier = (
	specifier: string,
) => (
	!isFilePath(specifier)
	&& !urlLikeSpecifierPattern.test(specifier)
);

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

const isModuleNotFound = (
	code: string | undefined,
) => (
	code === 'ERR_MODULE_NOT_FOUND'
	|| code === 'MODULE_NOT_FOUND'
);

const isDirectoryEntryMiss = (
	error: unknown,
) => (
	error instanceof Error
	&& (
		isModuleNotFound((error as NodeError).code)
		|| (error as NodeError).code === 'ERR_UNSUPPORTED_DIR_IMPORT'
	)
);

// Node ESM requires explicit file extensions. tsx retries a missing emitted
// JavaScript path as source TypeScript only after Node rejects the exact path.
// https://github.com/nodejs/node/blob/v18.20.8/doc/api/esm.md#L165-L170

const isCommonJsRequireContext = (
	context: ResolveHookContext,
) => (
	context.conditions.includes('require')
	&& !context.conditions.includes('import')
);

const getUrlMetadataIndex = (
	url: string,
) => {
	const queryIndex = url.indexOf('?');
	const fragmentIndex = url.indexOf('#');
	if (queryIndex === -1) {
		return fragmentIndex;
	}
	if (fragmentIndex === -1) {
		return queryIndex;
	}
	return Math.min(queryIndex, fragmentIndex);
};

const getSpecifierMetadataIndex = (
	specifier: string,
	isCommonJsRequire: boolean,
) => {
	if (isCommonJsRequire) {
		return specifier.indexOf('?');
	}

	if (
		!isFilePath(specifier)
		&& !urlLikeSpecifierPattern.test(specifier)
	) {
		return specifier.indexOf('?');
	}

	return getUrlMetadataIndex(specifier);
};

const getParentFilePath = (
	parentURL: string | undefined,
) => {
	if (!parentURL?.startsWith(fileUrlPrefix)) {
		return;
	}

	return fileURLToPath(new URL(parentURL));
};

const isTypeScriptParent = (
	parentURL: string | undefined,
) => {
	if (!parentURL) {
		return false;
	}

	const parentPath = getParentFilePath(parentURL);
	if (parentPath) {
		return tsExtensionsPattern.test(parentPath);
	}

	const metadataIndex = getUrlMetadataIndex(parentURL);
	return tsExtensionsPattern.test(
		metadataIndex === -1
			? parentURL
			: parentURL.slice(0, metadataIndex),
	);
};

const isParentDependency = (
	parentURL: string | undefined,
) => {
	const parentPath = getParentFilePath(parentURL);
	return parentPath !== undefined && isDependencyPath(parentPath);
};

const isImplicitJavaScriptDependency = (
	fileUrl: string,
) => (
	path.extname(new URL(fileUrl).pathname) === '.js'
	&& isDependencyPath(fileURLToPath(fileUrl))
);

const resolvesTsExtensions = (
	parentURL: string | undefined,
	allowJs: boolean,
) => (
	isTypeScriptParent(parentURL)

	// allowJs makes local JavaScript source eligible for TypeScript resolution.
	// Dependencies preserve published JavaScript and Node's normal resolution.
	// https://github.com/microsoft/TypeScript-Website/blob/4b665c09b2f57873e6ac0dc9d6d549a5cc61cf9a/packages/tsconfig-reference/copy/en/options/allowJs.md#L3-L39
	|| (allowJs && !isParentDependency(parentURL))
);

/**
 * Maps a candidate specifier to a file path if it can be statted directly.
 * Returns undefined when existence can't be cheaply determined
 * (e.g. bare specifiers), in which case the candidate must be probed
 * via nextResolve()
 */
const getProbeFilePath = (
	candidate: string,
	parentURL: string | undefined,
) => {
	const metadataIndex = getUrlMetadataIndex(candidate);
	const pathname = metadataIndex === -1 ? candidate : candidate.slice(0, metadataIndex);
	try {
		if (pathname.startsWith(fileUrlPrefix)) {
			return fileURLToPath(pathname);
		}
		if (path.isAbsolute(pathname)) {
			return pathname;
		}
		if (isRelativePath(pathname) && parentURL?.startsWith(fileUrlPrefix)) {
			return fileURLToPath(new URL(pathname, parentURL));
		}
	} catch {}
};

/**
 * Failed resolutions are expensive: Node constructs an ERR_MODULE_NOT_FOUND
 * and decorates it with a CommonJS resolution hint, which re-enters the
 * (tsx-patched) CJS resolver (https://github.com/privatenumber/tsx/issues/809)
 *
 * Skip candidates that can be cheaply confirmed to not exist
 */
const candidateDoesntExist = (
	candidate: string,
	parentURL: string | undefined,
) => {
	const filePath = getProbeFilePath(candidate, parentURL);
	return filePath !== undefined && !existsSync(filePath);
};

const resolveExtensions = async (
	url: string,
	context: ResolveHookContext,
	nextResolve: NextResolve,
	throwError?: boolean,
) => {
	const tryPaths = getExtensionResolution(url);
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
		if (candidateDoesntExist(tsPath, context.parentURL)) {
			continue;
		}

		try {
			return await nextResolve(tsPath, context);
		} catch (error) {
			const { code } = error as NodeError;
			if (
				!isModuleNotFound(code)
				&& code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED'
			) {
				throw error;
			}

			caughtError = error;
		}
	}

	if (throwError) {
		if (caughtError === undefined) {
			// All candidates were skipped; resolve one to produce a real error
			return nextResolve(tryPaths[0]!, context);
		}
		throw caughtError;
	}
};

const resolveExtensionsSync = (
	url: string,
	context: ResolveHookContext,
	nextResolve: NextResolveSync,
	throwError?: boolean,
) => {
	const tryPaths = getExtensionResolution(url);
	log(3, 'resolveExtensionsSync', {
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
		if (candidateDoesntExist(tsPath, context.parentURL)) {
			continue;
		}

		try {
			return nextResolve(tsPath, context);
		} catch (error) {
			const { code } = error as NodeError;
			if (
				!isModuleNotFound(code)
				&& code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED'
			) {
				throw error;
			}

			caughtError = error;
		}
	}

	if (throwError) {
		if (caughtError === undefined) {
			// All candidates were skipped; resolve one to produce a real error
			return nextResolve(tryPaths[0]!, context);
		}
		throw caughtError;
	}
};

const resolveBase = async (
	specifier: string,
	context: ResolveHookContext,
	nextResolve: NextResolve,
	hookData: Data,
) => {
	const allowJs = hookData.parsedTsconfig?.config.compilerOptions?.allowJs ?? false;
	const resolveTsExtensions = resolvesTsExtensions(context.parentURL, allowJs);

	log(3, 'resolveBase', {
		specifier,
		context,
		specifierStartsWithFileUrl: specifier.startsWith(fileUrlPrefix),
		isRelativePath: isRelativePath(specifier),
		resolveTsExtensions,
		allowJs,
	});

	/**
	 * TypeScript source and local allowJs JavaScript resolve source candidates first.
	 * Runtime dependencies first delegate their requested path to Node.
	 */
	if (
		(
			specifier.startsWith(fileUrlPrefix)
			|| isRelativePath(specifier)
		)
		&& resolveTsExtensions
	) {
		const resolved = await resolveExtensions(
			specifier,
			context,
			nextResolve,
			undefined,
		);
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
			if (isModuleNotFound(nodeError.code)) {
				// Resolving .js -> .ts in exports/imports map
				const errorPath = getMissingPathFromNotFound(nodeError);
				if (errorPath) {
					const resolved = await resolveExtensions(
						errorPath,
						context,
						nextResolve,
						undefined,
					);
					if (resolved) {
						return resolved;
					}
				}
			}
		}

		throw error;
	}
};

const resolveBaseSync = (
	specifier: string,
	context: ResolveHookContext,
	nextResolve: NextResolveSync,
	hookData: Data,
) => {
	const allowJs = hookData.parsedTsconfig?.config.compilerOptions?.allowJs ?? false;
	const resolveTsExtensions = resolvesTsExtensions(context.parentURL, allowJs);

	log(3, 'resolveBaseSync', {
		specifier,
		context,
		specifierStartsWithFileUrl: specifier.startsWith(fileUrlPrefix),
		isRelativePath: isRelativePath(specifier),
		resolveTsExtensions,
		allowJs,
	});

	if (
		(
			specifier.startsWith(fileUrlPrefix)
			|| isRelativePath(specifier)
		)
		&& resolveTsExtensions
	) {
		const resolved = resolveExtensionsSync(
			specifier,
			context,
			nextResolve,
			undefined,
		);
		log(3, 'resolveBaseSync resolved', {
			specifier,
			context,
			resolved,
		});
		if (resolved) {
			return resolved;
		}
	}

	try {
		return nextResolve(specifier, context);
	} catch (error) {
		log(3, 'resolveBaseSync error', {
			specifier,
			context,
			error,
		});
		if (error instanceof Error) {
			const nodeError = error as NodeError;
			if (isModuleNotFound(nodeError.code)) {
				// Resolving .js -> .ts in exports/imports map
				const errorPath = getMissingPathFromNotFound(nodeError);
				if (errorPath) {
					const resolved = resolveExtensionsSync(
						errorPath,
						context,
						nextResolve,
						undefined,
					);
					if (resolved) {
						return resolved;
					}
				}
			}
		}

		throw error;
	}
};

const resolveDirectory = async (
	specifier: string,
	context: ResolveHookContext,
	nextResolve: NextResolve,
	hookData: Data,
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
		return await resolveBase(specifier, context, nextResolve, hookData);
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
					if (specifier.startsWith('#')) {
						throw error;
					}

					const packageSubpath = getPackageSubpathDirectoryInfo(specifier, errorPath);
					if (packageSubpath?.kind === 'root-exports') {
						throw error;
					}

					if (packageSubpath?.mainUrl) {
						try {
							// Preserve Node's exact package main before tsx's extension fallback.
							return await nextResolve(packageSubpath.mainUrl, context);
						} catch (mainError) {
							if (!isDirectoryEntryMiss(mainError)) {
								throw mainError;
							}
						}

						try {
							return await resolveDirectory(
								packageSubpath.mainUrl,
								context,
								nextResolve,
								hookData,
							);
						} catch (mainError) {
							if (!isDirectoryEntryMiss(mainError)) {
								throw mainError;
							}

							// The legacy package fallback tries the directory index when "main" misses.
						}
					}

					const indexUrl = `${errorPath}/index`;
					const indexResolved = await resolveExtensions(
						indexUrl,
						context,
						nextResolve,
					);
					if (indexResolved) {
						return indexResolved;
					}
				}
			}
		}

		throw error;
	}
};

const resolveDirectorySync = (
	specifier: string,
	context: ResolveHookContext,
	nextResolve: NextResolveSync,
	hookData: Data,
) => {
	log(3, 'resolveDirectorySync', {
		specifier,
		context,
		isDirectory: isDirectoryPattern.test(specifier),
	});
	if (specifier === '.' || specifier === '..' || specifier.endsWith('/..')) {
		specifier += '/';
	}

	if (isDirectoryPattern.test(specifier)) {
		// On Node's sync hooks, a CommonJS require() inside a dependency reaches
		// this hook. A bare specifier with a trailing slash (e.g. `process/`) is a
		// package, not a relative directory, so defer to resolveBaseSync, which
		// lets Node resolve the package while retrying TypeScript extensions.
		// https://github.com/privatenumber/tsx/issues/800
		const isCjsRequire = isCommonJsRequireContext(context);
		if (isCjsRequire && !isFilePath(specifier)) {
			return resolveBaseSync(specifier, context, nextResolve, hookData);
		}

		const urlParsed = new URL(specifier, context.parentURL);

		// If directory, can be index.js, index.ts, etc.
		urlParsed.pathname = path.join(urlParsed.pathname, 'index');

		if (!isCjsRequire) {
			return resolveExtensionsSync(
				urlParsed.toString(),
				context,
				nextResolve,
				true,
			)!;
		}

		// Node's CommonJS resolver rejects file:// URLs, so resolve the implicit
		// index from a filesystem path. Fall back to Node's directory resolution
		// (package.json "main") via resolveBaseSync when no index file exists.
		//
		// This prefers the index over "main", matching tsx's CommonJS loader
		// (which prioritizes index.ts). Native Node resolves "main" first.
		const indexResolved = resolveExtensionsSync(
			fileURLToPath(urlParsed),
			context,
			nextResolve,
			false,
		);
		return indexResolved ?? resolveBaseSync(specifier, context, nextResolve, hookData);
	}

	try {
		return resolveBaseSync(specifier, context, nextResolve, hookData);
	} catch (error) {
		if (error instanceof Error) {
			log(3, 'resolveDirectorySync error', {
				specifier,
				context,
				error,
			});
			const nodeError = error as NodeError;
			if (nodeError.code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
				const errorPath = getMissingPathFromNotFound(nodeError);
				if (errorPath) {
					if (specifier.startsWith('#')) {
						throw error;
					}

					const packageSubpath = getPackageSubpathDirectoryInfo(specifier, errorPath);
					if (packageSubpath?.kind === 'root-exports') {
						throw error;
					}

					if (packageSubpath?.mainUrl) {
						try {
							// Preserve Node's exact package main before tsx's extension fallback.
							return nextResolve(packageSubpath.mainUrl, context);
						} catch (mainError) {
							if (!isDirectoryEntryMiss(mainError)) {
								throw mainError;
							}
						}

						try {
							return resolveDirectorySync(
								packageSubpath.mainUrl,
								context,
								nextResolve,
								hookData,
							);
						} catch (mainError) {
							if (!isDirectoryEntryMiss(mainError)) {
								throw mainError;
							}

							// The legacy package fallback tries the directory index when "main" misses.
						}
					}

					const indexUrl = `${errorPath}/index`;
					const indexResolved = resolveExtensionsSync(
						indexUrl,
						context,
						nextResolve,
					);
					if (indexResolved) {
						return indexResolved;
					}
				}
			}
		}

		throw error;
	}
};

const resolveTsPaths = async (
	specifier: string,
	context: ResolveHookContext,
	nextResolve: NextResolve,
	hookData: Data,
) => {
	const tsconfigPathAliasSpecifier = isTsconfigPathAliasSpecifier(specifier);
	log(3, 'resolveTsPaths', {
		specifier,
		context,

		tsconfigPathAliasSpecifier,
		tsconfig: hookData.parsedTsconfig,
		fromNodeModules: isParentDependency(context.parentURL),
	});
	if (
		// Bare specifier or TS path alias (e.g. `ns:foo`)
		tsconfigPathAliasSpecifier
		// TS path alias
		&& hookData.parsedTsconfig
		&& !isParentDependency(context.parentURL)
	) {
		const possiblePaths = resolvePathAlias(hookData.parsedTsconfig, specifier);
		log(3, 'resolveTsPaths', {
			possiblePaths,
		});
		for (const possiblePath of possiblePaths) {
			try {
				return await resolveDirectory(
					pathToFileURL(possiblePath).toString(),
					context,
					nextResolve,
					hookData,
				);
			} catch {}
		}
	}

	return resolveDirectory(specifier, context, nextResolve, hookData);
};

const resolveTsPathsSync = (
	specifier: string,
	context: ResolveHookContext,
	nextResolve: NextResolveSync,
	hookData: Data,
) => {
	const tsconfigPathAliasSpecifier = isTsconfigPathAliasSpecifier(specifier);
	log(3, 'resolveTsPathsSync', {
		specifier,
		context,

		tsconfigPathAliasSpecifier,
		tsconfig: hookData.parsedTsconfig,
		fromNodeModules: isParentDependency(context.parentURL),
	});
	if (
		// Bare specifier or TS path alias (e.g. `ns:foo`)
		tsconfigPathAliasSpecifier
		// TS path alias
		&& hookData.parsedTsconfig
		&& !isParentDependency(context.parentURL)
	) {
		const possiblePaths = resolvePathAlias(hookData.parsedTsconfig, specifier);
		log(3, 'resolveTsPathsSync', {
			possiblePaths,
		});
		for (const possiblePath of possiblePaths) {
			try {
				return resolveDirectorySync(
					pathToFileURL(possiblePath).toString(),
					context,
					nextResolve,
					hookData,
				);
			} catch {}
		}
	}

	return resolveDirectorySync(specifier, context, nextResolve, hookData);
};

const tsxProtocol = 'tsx://';

const addQuery = (
	url: string,
	query: string,
) => {
	const fragmentIndex = url.indexOf('#');
	const urlWithoutFragment = fragmentIndex === -1 ? url : url.slice(0, fragmentIndex);
	const fragment = fragmentIndex === -1 ? '' : url.slice(fragmentIndex);
	return `${urlWithoutFragment}${urlWithoutFragment.includes('?') ? '&' : '?'}${query}${fragment}`;
};

const mergeUrlMetadata = (
	url: string,
	metadata: string,
) => {
	const metadataFragmentIndex = metadata.indexOf('#');
	const query = metadata[0] === '?'
		? metadata.slice(1, metadataFragmentIndex === -1 ? undefined : metadataFragmentIndex)
		: '';
	const requestFragment = metadataFragmentIndex === -1 ? '' : metadata.slice(metadataFragmentIndex);
	const urlFragmentIndex = url.indexOf('#');
	const urlWithoutFragment = urlFragmentIndex === -1 ? url : url.slice(0, urlFragmentIndex);
	const urlFragment = urlFragmentIndex === -1 ? '' : url.slice(urlFragmentIndex);
	const urlWithQuery = query ? addQuery(urlWithoutFragment, query) : urlWithoutFragment;
	return new URL(`${urlWithQuery}${requestFragment || urlFragment}`).toString();
};

// When tsx's CJS resolver (preserve-query.ts) returns a path with a
// `?namespace=<id>` cache-isolation query appended, the CJS loader feeds
// that path through pathToFileURL to dispatch via the module customization
// hooks. pathToFileURL encodes the `?` as `%3F` inside the URL pathname,
// then ESM resolve re-enters with that URL as the specifier. Without tsx's
// own virtual-query marker (`tsx-commonjs-virtual-query=1`) the encoded
// segment is not a tsx ESM URL, just a CJS-bridge artifact. Forwarding it
// to nextResolve makes Node stat a literal `index.cjs?namespace=...` path
// and ENOENT. Strip the encoded segment so resolution falls back to the
// real file on disk; the CJS bridge keeps its own Module._cache namespace
// isolation via the in-memory cache key, so nothing else needs the query
// at this point.
const stripCjsBridgeArtifact = (url: string | undefined) => {
	if (!url || !url.startsWith(fileUrlPrefix)) {
		return url;
	}
	const fileUrl = new URL(url);
	if (fileUrl.searchParams.has(commonJsVirtualQuerySearchParameter)) {
		return url;
	}
	const queryIndex = fileUrl.pathname.toLowerCase().lastIndexOf('%3f');
	if (queryIndex === -1) {
		return url;
	}
	fileUrl.pathname = fileUrl.pathname.slice(0, queryIndex);
	return fileUrl.toString();
};

const preserveCommonJsQueryIdentity = (
	url: string,
	format: string | null | undefined,
	requestNamespace: string | undefined,
) => {
	if (
		format !== 'commonjs'
		|| !url.startsWith(fileUrlPrefix)
		|| !implicitTsExtensionsPattern.test(url)
	) {
		return url;
	}

	const fileUrl = new URL(url);
	const virtualQuery = [
		getQueryWithoutParameters(fileUrl.search, [namespaceQuery]),
		...(
			requestNamespace
				? [`namespace=${encodeURIComponent(requestNamespace)}`]
				: []
		),
	].filter(Boolean).join('&');

	if (!virtualQuery) {
		return url;
	}

	fileUrl.pathname += `%3F${virtualQuery}`;
	fileUrl.searchParams.set(commonJsVirtualQuerySearchParameter, '1');
	return fileUrl.toString();
};

export const createResolve = (
	hookData: Data,
): ResolveHook => {
	const resolve: ResolveHook = async (
		specifier,
		context,
		nextResolve,
	) => {
		if (
			!hookData.active
			|| specifier.startsWith('node:')
		) {
			return nextResolve(specifier, context);
		}

		specifier = stripCjsBridgeArtifact(specifier) ?? specifier;
		const cleanedParentURL = stripCjsBridgeArtifact(context.parentURL);
		if (cleanedParentURL !== context.parentURL) {
			context.parentURL = cleanedParentURL;
		}

		let requestNamespace = getNamespace(specifier) ?? (
			// Inherit namespace from parent
			context.parentURL && getNamespace(context.parentURL)
		);

		if (hookData.namespace) {
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

			if (hookData.namespace !== requestNamespace) {
				return nextResolve(specifier, context);
			}

			if (tsImportRequest) {
				specifier = tsImportRequest.specifier;
				context.parentURL = tsImportRequest.parentURL;
			}
		}

		const metadataIndex = getSpecifierMetadataIndex(
			specifier,
			isCommonJsRequireContext(context),
		);
		const cleanSpecifier = metadataIndex === -1 ? specifier : specifier.slice(0, metadataIndex);
		const urlMetadata = metadataIndex === -1 ? '' : specifier.slice(metadataIndex);

		const resolution = await resolveTsPaths(
			cleanSpecifier,
			context,
			nextResolve,
			hookData,
		);

		log(2, 'nextResolve', {
			resolved: resolution,
		});

		if (resolution.format === 'builtin') {
			return resolution;
		}

		// A composed loader may reuse this result for a later request.
		const resolved = { ...resolution };

		// Filter out data: (sourcemaps)
		if (resolved.url.startsWith(fileUrlPrefix)) {
			// Node already determined the module type to compute these formats.
			if (resolved.format === 'module-typescript') {
				resolved.format = 'module';
			} else if (resolved.format === 'commonjs-typescript') {
				resolved.format = 'commonjs';
			} else if (
				!resolved.format
				&& !isImplicitJavaScriptDependency(resolved.url)
			) {
				// Node detects ESM syntax for typeless dependency JavaScript during load.
				// https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/get_format.js#L181-L191
				// Older Node versions and typeless .ts can return no format.
				resolved.format = await getFormatFromFileUrl(resolved.url);
				log(2, 'getFormatFromFileUrl', {
					resolved,
					format: resolved.format,
				});
			}
		}

		if (urlMetadata) {
			resolved.url = mergeUrlMetadata(resolved.url, urlMetadata);
		}

		// Node 18's CJS ESM translator ignores loader-provided source and
		// preparses the original file, so only named imports/re-exports use the
		// ESM fallback. Source-capable async loaders use the same hint for static
		// namespace imports so Node preparses the transformed CJS export annotation.
		// https://github.com/nodejs/node/blob/v18.20.8/lib/internal/modules/esm/translators.js#L183-L190
		// https://github.com/nodejs/node/blob/v22.22.2/lib/internal/modules/esm/translators.js#L182-L190
		const shouldLoadForCommonJsExportPreparse = (
			context.parentURL
			&& resolved.format === 'commonjs'
			&& implicitTsExtensionsPattern.test(resolved.url)
			&& (
				new URL(context.parentURL).searchParams.has(commonJsExportPreparseSearchParameter)
				|| parentImportsCommonJsExports(context.parentURL, specifier, supportsEsmLoadReadFile)
			)
		);

		// Inherit namespace
		if (
			requestNamespace
			&& getNamespace(resolved.url) === undefined
		) {
			resolved.url = addQuery(resolved.url, `${namespaceQuery}${requestNamespace}`);
		}

		if (shouldLoadForCommonJsExportPreparse) {
			resolved.url = addQuery(resolved.url, commonJsExportPreparseQuery);
		}

		if (requestNamespace || shouldLoadForCommonJsExportPreparse) {
			resolved.url = preserveCommonJsQueryIdentity(
				resolved.url,
				resolved.format,
				requestNamespace,
			);
		}

		return resolved;
	};

	if (!debugEnabled) {
		return resolve;
	}

	return async (
		specifier,
		context,
		nextResolve,
	) => {
		log(2, 'resolve', {
			specifier,
			context,
		});
		const result = await resolve(specifier, context, nextResolve);
		log(1, 'resolved', {
			specifier,
			context,
			result,
		});
		return result;
	};
};

export const createResolveSync = (
	hookData: Data,
): ResolveHookSync => {
	const resolve: ResolveHookSync = (
		specifier,
		context,
		nextResolve,
	) => {
		if (
			!hookData.active
			|| specifier.startsWith('node:')
			|| (isCommonJsRequireContext(context) && isGlobalCjsLoaderActive())
		) {
			return nextResolve(specifier, context);
		}

		specifier = stripCjsBridgeArtifact(specifier) ?? specifier;
		const cleanedParentURL = stripCjsBridgeArtifact(context.parentURL);
		if (cleanedParentURL !== context.parentURL) {
			context.parentURL = cleanedParentURL;
		}

		let requestNamespace = getNamespace(specifier) ?? (
			// Inherit namespace from parent
			context.parentURL && getNamespace(context.parentURL)
		);

		if (hookData.namespace) {
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

			if (hookData.namespace !== requestNamespace) {
				return nextResolve(specifier, context);
			}

			if (tsImportRequest) {
				specifier = tsImportRequest.specifier;
				context.parentURL = tsImportRequest.parentURL;
			}
		}

		const metadataIndex = getSpecifierMetadataIndex(
			specifier,
			isCommonJsRequireContext(context),
		);
		const cleanSpecifier = metadataIndex === -1 ? specifier : specifier.slice(0, metadataIndex);
		const urlMetadata = metadataIndex === -1 ? '' : specifier.slice(metadataIndex);

		const resolution = resolveTsPathsSync(
			cleanSpecifier,
			context,
			nextResolve,
			hookData,
		);

		log(2, 'nextResolve', {
			resolved: resolution,
		});

		if (resolution.format === 'builtin') {
			return resolution;
		}

		// A composed loader may reuse this result for a later request.
		const resolved = { ...resolution };

		// Filter out data: (sourcemaps)
		if (resolved.url.startsWith(fileUrlPrefix)) {
			// Node already determined the module type to compute these formats.
			if (resolved.format === 'module-typescript') {
				resolved.format = 'module';
			} else if (resolved.format === 'commonjs-typescript') {
				resolved.format = 'commonjs';
			} else if (
				!resolved.format
				&& !isImplicitJavaScriptDependency(resolved.url)
			) {
				// Node detects ESM syntax for typeless dependency JavaScript during load.
				// https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/get_format.js#L181-L191
				// Older Node versions and typeless .ts can return no format.
				resolved.format = getFormatFromFileUrlSync(resolved.url);
				log(2, 'getFormatFromFileUrlSync', {
					resolved,
					format: resolved.format,
				});
			}
		}

		if (urlMetadata) {
			resolved.url = mergeUrlMetadata(resolved.url, urlMetadata);
		}

		// Inherit namespace
		if (
			requestNamespace
			&& getNamespace(resolved.url) === undefined
		) {
			resolved.url = addQuery(resolved.url, `${namespaceQuery}${requestNamespace}`);
		}

		resolved.url = preserveCommonJsQueryIdentity(
			resolved.url,
			resolved.format,
			requestNamespace,
		);

		return resolved;
	};

	if (!debugEnabled) {
		return resolve;
	}

	return (
		specifier,
		context,
		nextResolve,
	) => {
		log(2, 'resolveSync', {
			specifier,
			context,
		});
		const result = resolve(specifier, context, nextResolve);
		log(1, 'resolvedSync', {
			specifier,
			context,
			result,
		});
		return result;
	};
};
