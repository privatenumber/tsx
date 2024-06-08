import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolveTsPath } from '../../utils/resolve-ts-path.js';
import type { NodeError } from '../../types.js';
import { isRelativePath, fileUrlPrefix, tsExtensionsPattern } from '../../utils/path-utils.js';
import { tsconfigPathsMatcher, allowJs } from '../../utils/tsconfig.js';
import { urlSearchParamsStringify } from '../../utils/url-search-params-stringify.js';

type ResolveFilename = typeof Module._resolveFilename;

type SimpleResolve = (request: string) => string;

const nodeModulesPath = `${path.sep}node_modules${path.sep}`;

export const interopCjsExports = (
	request: string,
) => {
	if (!request.startsWith('data:text/javascript,')) {
		return request;
	}

	const queryIndex = request.indexOf('?');
	if (queryIndex === -1) {
		return request;
	}

	const searchParams = new URLSearchParams(request.slice(queryIndex + 1));
	let realPath = searchParams.get('filePath');
	if (realPath) {
		const namespace = searchParams.get('namespace');
		if (namespace) {
			realPath += `?namespace=${encodeURIComponent(namespace)}`;
		}

		// The CJS module cache needs to be updated with the actual path for export parsing to work
		// https://github.com/nodejs/node/blob/v22.2.0/lib/internal/modules/esm/translators.js#L338
		Module._cache[realPath] = Module._cache[request];
		delete Module._cache[request];
		request = realPath;
	}

	return request;
};

/**
 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
 */
const resolveTsFilename = (
	resolve: SimpleResolve,
	request: string,
	parent: Module.Parent,
) => {
	if (
		!(parent?.filename && tsExtensionsPattern.test(parent.filename))
		&& !allowJs
	) {
		return;
	}

	const tsPath = resolveTsPath(request);
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

const extensions = ['.ts', '.tsx', '.jsx'] as const;

const tryExtensions = (
	resolve: SimpleResolve,
	request: string,
) => {
	for (const extension of extensions) {
		try {
			return resolve(request + extension);
		} catch {}
	}
};

export const createResolveFilename = (
	nextResolve: ResolveFilename,
	namespace?: string,
): ResolveFilename => (
	request,
	parent,
	isMain,
	options,
) => {
	const resolve: SimpleResolve = request_ => nextResolve(
		request_,
		parent,
		isMain,
		options,
	);

	request = interopCjsExports(request);

	// Strip query string
	const [cleanRequest, queryString] = request.split('?');
	const searchParams = new URLSearchParams(queryString);

	// Inherit parent namespace if it exists
	if (parent?.filename) {
		const parentQuery = new URLSearchParams(parent.filename.split('?')[1]);
		const parentNamespace = parentQuery.get('namespace');
		if (parentNamespace) {
			searchParams.append('namespace', parentNamespace);
		}
	}

	// If request namespace  doesnt match the namespace, ignore
	if ((searchParams.get('namespace') ?? undefined) !== namespace) {
		return resolve(request);
	}

	const query = urlSearchParamsStringify(searchParams);

	// Temporarily remove query since default resolver can't handle it. Added back later.
	request = cleanRequest;

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
				return tsFilename + query;
			}

			try {
				return resolve(possiblePath) + query;
			} catch {
				/**
				 * Try order:
				 * https://github.com/nodejs/node/blob/v22.2.0/lib/internal/modules/cjs/loader.js#L410-L413
				 */
				const resolved = (
					tryExtensions(resolve, possiblePath)
					|| tryExtensions(resolve, `${request}${path.sep}index`)
				);
				if (resolved) {
					return resolved + query;
				}
			}
		}
	}

	// If extension exists
	const tsFilename = resolveTsFilename(resolve, request, parent);
	if (tsFilename) {
		return tsFilename + query;
	}

	try {
		const resolved = resolve(request);

		// Can be a node core module
		return resolved + (path.isAbsolute(resolved) ? query : '');
	} catch (error) {
		const resolved = (
			tryExtensions(resolve, request)
			// Default resolve handles resovling paths relative to the parent
			|| tryExtensions(resolve, `${request}${path.sep}index`)
		);
		if (resolved) {
			return resolved + query;
		}

		throw error;
	}
};
