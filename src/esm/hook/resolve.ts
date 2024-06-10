import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type {
	ResolveFnOutput,
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
	isBarePackageName,
} from '../../utils/path-utils.js';
import {
	getFormatFromFileUrl,
	namespaceQuery,
	getNamespace,
	type MaybePromise,
} from './utils.js';
import { data } from './initialize.js';

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

const resolveMissingFormat = async (
	resolved: ResolveFnOutput,
) => {
	if (
		!resolved.format
		// Filter out node: and data: (sourcemaps)
		&& resolved.url.startsWith(fileUrlPrefix)
	) {
		resolved.format = await getFormatFromFileUrl(resolved.url);
	}

	return resolved;
};

const extensions = ['.js', '.json', '.ts', '.tsx', '.jsx'] as const;

const tryExtensions = async (
	specifier: string,
	context: ResolveHookContext,
	nextResolve: NextResolve,
) => {
	const [specifierWithoutQuery, query] = specifier.split('?');
	let throwError: Error | undefined;
	for (const extension of extensions) {
		try {
			return await resolveMissingFormat(
				await nextResolve(
					specifierWithoutQuery + extension + (query ? `?${query}` : ''),
					context,
				),
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
	nextResolve: NextResolve,
) => {
	const isExplicitDirectory = isDirectoryPattern.test(specifier);
	const appendIndex = isExplicitDirectory ? 'index' : '/index';
	const [specifierWithoutQuery, query] = specifier.split('?');

	try {
		return await tryExtensions(
			specifierWithoutQuery + appendIndex + (query ? `?${query}` : ''),
			context,
			nextResolve,
		);
	} catch (_error) {
		if (!isExplicitDirectory) {
			try {
				return await tryExtensions(specifier, context, nextResolve);
			} catch {}
		}

		const error = _error as Error;
		const { message } = error;
		error.message = error.message.replace(`${appendIndex.replace('/', path.sep)}'`, "'");
		error.stack = error.stack!.replace(message, error.message);
		throw error;
	}
};

const tryTsPaths = async (
	url: string,
	context: ResolveHookContext,
	nextResolve: NextResolve,
) => {
	const tsPaths = mapTsExtensions(url);
	if (!tsPaths) {
		return;
	}

	for (const tsPath of tsPaths) {
		try {
			return await resolveMissingFormat(
				await nextResolve(tsPath, context),
			);
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
};

export const resolve: resolve = async (
	specifier,
	context,
	nextResolve,
	recursiveCall,
) => {
	if (!data.active) {
		return nextResolve(specifier, context);
	}

	const parentNamespace = context.parentURL && getNamespace(context.parentURL);
	const acceptsQuery = requestAcceptsQuery(specifier);
	if (acceptsQuery) {
		// Inherit namespace from parent
		let requestNamespace = getNamespace(specifier);
		if (parentNamespace && !requestNamespace) {
			requestNamespace = parentNamespace;
			specifier += `${specifier.includes('?') ? '&' : '?'}${namespaceQuery}${parentNamespace}`;
		}

		if (data.namespace && data.namespace !== requestNamespace) {
			return nextResolve(specifier, context);
		}

		// If directory, can be index.js, index.ts, etc.
		if (isDirectoryPattern.test(specifier)) {
			return await tryDirectory(specifier, context, nextResolve);
		}
	} else if ( // Bare specifier
		// TS path alias
		tsconfigPathsMatcher
		&& !context.parentURL?.includes('/node_modules/')
	) {
		const possiblePaths = tsconfigPathsMatcher(specifier);
		for (const possiblePath of possiblePaths) {
			try {
				return await resolve(
					pathToFileURL(possiblePath).toString(),
					context,
					nextResolve,
				);
			} catch {}
		}
	}

	// Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
	//
	// If `allowJs` is set in `tsconfig.json`, then we'll apply the same resolution logic
	// to files without a TypeScript extension.
	if (
		(
			specifier.startsWith('#')
			// Ignore if it's a bare package name and there's no subpath
			|| !isBarePackageName.test(specifier)
		)
		&& (
			tsExtensionsPattern.test(context.parentURL!)
			|| allowJs
		)
	) {
		// TODO: When guessing the .ts extension in a package, should it guess if there's an export map?
		const resolved = await tryTsPaths(specifier, context, nextResolve);
		if (resolved) {
			return resolved;
		}
	}

	try {
		const resolved = await resolveMissingFormat(
			await nextResolve(specifier, context),
		);
		// Could be a core Node module (e.g. `fs`)
		if (requestAcceptsQuery(resolved.url)) {
			const resolvedNamespace = getNamespace(resolved.url);
			if (
				parentNamespace
				&& !resolvedNamespace
			) {
				resolved.url += `${resolved.url.includes('?') ? '&' : '?'}${namespaceQuery}${parentNamespace}`;
			}
		}
		return resolved;
	} catch (error) {
		if (
			error instanceof Error
			&& !recursiveCall
		) {
			const nodeError = error as NodeError;
			const { code } = nodeError;
			if (code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
				try {
					return await tryDirectory(specifier, context, nextResolve);
				} catch (error_) {
					if ((error_ as NodeError).code !== 'ERR_PACKAGE_IMPORT_NOT_DEFINED') {
						throw error_;
					}
				}
			}

			if (code === 'ERR_MODULE_NOT_FOUND') {
				// Resolving .js -> .ts in exports map
				if (nodeError.url) {
					const resolved = await tryTsPaths(nodeError.url, context, nextResolve);
					if (resolved) {
						return resolved;
					}
				} else {
					const isExportPath = error.message.match(/^Cannot find module '([^']+)'/);
					if (isExportPath) {
						const [, exportPath] = isExportPath;
						const resolved = await tryTsPaths(exportPath, context, nextResolve);
						if (resolved) {
							return resolved;
						}
					}

					const isPackagePath = error.message.match(/^Cannot find package '([^']+)'/);
					if (isPackagePath) {
						const [, packageJsonPath] = isPackagePath;
						const packageJsonUrl = pathToFileURL(packageJsonPath);

						if (!packageJsonUrl.pathname.endsWith('/package.json')) {
							packageJsonUrl.pathname += '/package.json';
						}

						const packageJson = await readJsonFile<PackageJson>(packageJsonUrl);
						if (packageJson?.main) {
							const resolvedMain = new URL(packageJson.main, packageJsonUrl);
							const resolved = await tryTsPaths(resolvedMain.toString(), context, nextResolve);
							if (resolved) {
								return resolved;
							}
						}
					}
				}

				// If not bare specifier
				if (!isBarePackageName.test(specifier)) {
					try {
						return await tryExtensions(specifier, context, nextResolve);
					} catch {}
				}
			}
		}

		throw error;
	}
};
