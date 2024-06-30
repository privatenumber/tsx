import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { mapTsExtensions } from '../../utils/map-ts-extensions.js';
import type { NodeError } from '../../types.js';
import { isRelativePath, fileUrlPrefix, tsExtensionsPattern } from '../../utils/path-utils.js';
import { tsconfigPathsMatcher, allowJs } from '../../utils/tsconfig.js';
import { urlSearchParamsStringify } from '../../utils/url-search-params-stringify.js';
import type { ResolveFilename, SimpleResolve, LoaderState } from './types.js';
import { createImplicitResolver } from './resolve-implicit-extensions.js';

const nodeModulesPath = `${path.sep}node_modules${path.sep}`;

const getOriginalFilePath = (
	request: string,
) => {
	if (!request.startsWith('data:text/javascript,')) {
		return;
	}

	const queryIndex = request.indexOf('?');
	if (queryIndex === -1) {
		return;
	}

	const searchParams = new URLSearchParams(request.slice(queryIndex + 1));
	const filePath = searchParams.get('filePath');
	if (filePath) {
		return filePath;
	}
};

export const interopCjsExports = (
	request: string,
) => {
	const filePath = getOriginalFilePath(request);
	if (filePath) {
		// The CJS module cache needs to be updated with the actual path for export parsing to work
		// https://github.com/nodejs/node/blob/v22.2.0/lib/internal/modules/esm/translators.js#L338
		Module._cache[filePath] = Module._cache[request];
		delete Module._cache[request];
		request = filePath;
	}
	return request;
};

/**
 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
 */
const resolveTsFilename = (
	resolve: SimpleResolve,
	request: string,
	parent: Module.Parent | undefined,
) => {
	if (
		!(parent?.filename && tsExtensionsPattern.test(parent.filename))
		&& !allowJs
	) {
		return;
	}

	const tsPath = mapTsExtensions(request);
	if (!tsPath) {
		return;
	}

	for (const tryTsPath of tsPath) {
		try {
			return resolve(tryTsPath);
		} catch (error) {
			const { code } = error as NodeError;
			if (
				code !== 'MODULE_NOT_FOUND'
				&& code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED'
			) {
				throw error;
			}
		}
	}
};

const resolveRequest = (
	request: string,
	parent: Module.Parent | undefined,
	resolve: SimpleResolve,
) => {
	// Support file protocol
	if (request.startsWith(fileUrlPrefix)) {
		request = fileURLToPath(request);
	}

	// Resolve TS path alias
	if (
		tsconfigPathsMatcher

		// bare specifier
		&& !isRelativePath(request)

		// Dependency paths should not be resolved using tsconfig.json
		&& !parent?.filename?.includes(nodeModulesPath)
	) {
		const possiblePaths = tsconfigPathsMatcher(request);

		for (const possiblePath of possiblePaths) {
			const tsFilename = resolveTsFilename(resolve, possiblePath, parent);
			if (tsFilename) {
				return tsFilename;
			}

			try {
				return resolve(possiblePath);
			} catch {}
		}
	}

	// If extension exists
	const resolvedTsFilename = resolveTsFilename(resolve, request, parent);
	if (resolvedTsFilename) {
		return resolvedTsFilename;
	}

	try {
		return resolve(request);
	} catch (error) {
		const nodeError = error as NodeError;

		// Exports map resolution
		if (
			nodeError.code === 'MODULE_NOT_FOUND'
			&& typeof nodeError.path === 'string'
			&& nodeError.path.endsWith(`${path.sep}package.json`)
		) {
			const isExportsPath = nodeError.message.match(/^Cannot find module '([^']+)'$/);
			if (isExportsPath) {
				const exportsPath = isExportsPath[1];
				const tsFilename = resolveTsFilename(resolve, exportsPath, parent);
				if (tsFilename) {
					return tsFilename;
				}
			}

			const isMainPath = nodeError.message.match(/^Cannot find module '([^']+)'. Please verify that the package.json has a valid "main" entry$/);
			if (isMainPath) {
				const mainPath = isMainPath[1];
				const tsFilename = resolveTsFilename(resolve, mainPath, parent);
				if (tsFilename) {
					return tsFilename;
				}
			}
		}

		throw nodeError;
	}
};

export const createResolveFilename = (
	state: LoaderState,
	nextResolve: ResolveFilename,
	namespace?: string,
): ResolveFilename => (
	request,
	parent,
	...restOfArgs
) => {
	if (state.enabled === false) {
		return nextResolve(request, parent, ...restOfArgs);
	}

	request = interopCjsExports(request);

	// Strip query string
	const requestAndQuery = request.split('?');
	const searchParams = new URLSearchParams(requestAndQuery[1]);

	if (parent?.filename) {
		const filePath = getOriginalFilePath(parent.filename);
		if (filePath) {
			const pathAndQuery = filePath.split('?');
			const newFilename = pathAndQuery[0];

			/**
			 * Can't delete the old cache entry because there's an assertion
			 * https://github.com/nodejs/node/blob/v20.15.0/lib/internal/modules/esm/translators.js#L347
			 */
			// delete Module._cache[parent.filename];

			parent.filename = newFilename;
			// @ts-expect-error - private property
			parent.path = path.dirname(newFilename);
			// https://github.com/nodejs/node/blob/v20.15.0/lib/internal/modules/esm/translators.js#L383
			// @ts-expect-error - private property
			parent.paths = Module._nodeModulePaths(parent.path);

			Module._cache[newFilename] = parent as NodeModule;
		}

		// Inherit parent namespace if it exists
		const parentQuery = new URLSearchParams(parent.filename.split('?')[1]);
		const parentNamespace = parentQuery.get('namespace');
		if (parentNamespace) {
			searchParams.append('namespace', parentNamespace);
		}
	}

	// If request namespace doesnt match the namespace, ignore
	if ((searchParams.get('namespace') ?? undefined) !== namespace) {
		return nextResolve(request, parent, ...restOfArgs);
	}

	let _nextResolve = nextResolve;
	if (namespace) {
		/**
		 * When namespaced, the loaders are registered to the extensions in a hidden way
		 * so Node's built-in resolver will not try those extensions
		 *
		 * To support implicit extensions, we need to enhance the resolver with our own
		 * re-implementation of the implicit extension resolution
		 */
		_nextResolve = createImplicitResolver(_nextResolve);
	}

	const resolve: SimpleResolve = request_ => _nextResolve(
		request_,
		parent,
		...restOfArgs,
	);

	let resolved = resolveRequest(requestAndQuery[0], parent, resolve);

	// Only add query back if it's a file path (not a core Node module)
	if (
		path.isAbsolute(resolved)

		// These two have native loaders which don't support queries
		&& !resolved.endsWith('.json')
		&& !resolved.endsWith('.node')
	) {
		resolved += urlSearchParamsStringify(searchParams);
	}

	return resolved;
};
