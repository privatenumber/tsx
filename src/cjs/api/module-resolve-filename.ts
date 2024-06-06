import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolveTsPath } from '../../utils/resolve-ts-path.js';
import type { NodeError } from '../../types.js';
import { isRelativePath, fileUrlPrefix, tsExtensionsPattern } from '../../utils/path-utils.js';
import { tsconfigPathsMatcher, allowJs } from '../../utils/tsconfig.js';

type ResolveFilename = typeof Module._resolveFilename;

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
	const realPath = searchParams.get('filePath');
	if (realPath) {
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
	nextResolve: ResolveFilename,
	request: string,
	parent: Module.Parent,
	isMain: boolean,
	options?: Record<PropertyKey, unknown>,
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
			return nextResolve(
				tryTsPath,
				parent,
				isMain,
				options,
			);
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

export const createResolveFilename = (
	nextResolve: ResolveFilename,
): ResolveFilename => (
	request,
	parent,
	isMain,
	options,
) => {
	request = interopCjsExports(request);

	// Strip query string
	const queryIndex = request.indexOf('?');
	const query = queryIndex === -1 ? '' : request.slice(queryIndex);
	if (queryIndex !== -1) {
		request = request.slice(0, queryIndex);
	}

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
			const tsFilename = resolveTsFilename(nextResolve, possiblePath, parent, isMain, options);
			if (tsFilename) {
				return tsFilename + query;
			}

			try {
				return nextResolve(
					possiblePath,
					parent,
					isMain,
					options,
				) + query;
			} catch {}
		}
	}

	const tsFilename = resolveTsFilename(nextResolve, request, parent, isMain, options);
	if (tsFilename) {
		return tsFilename + query;
	}

	return nextResolve(request, parent, isMain, options) + query;
};
