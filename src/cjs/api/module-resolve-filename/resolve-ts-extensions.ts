import { mapTsExtensions } from '../../../utils/map-ts-extensions.js';
import type { NodeError } from '../../../types.js';
import {
	isFilePath,
	isDirectoryPattern,
} from '../../../utils/path-utils.js';
import { allowJs } from '../../../utils/tsconfig.js';
import type { SimpleResolve } from '../types.js';
import { logCjs } from '../../../utils/debug.js';

/**
 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
 */
const resolveTsFilename = (
	resolve: SimpleResolve,
	request: string,
	isTsParent: boolean,
) => {
	logCjs('resolveTsFilename', request);
	if (
		isDirectoryPattern.test(request)
		|| (!isTsParent && !allowJs)
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

export const createTsExtensionResolver = (
	nextResolve: SimpleResolve,
	isTsParent: boolean,
): SimpleResolve => (
	request,
) => {
	logCjs('resolveTsFilename', {
		request,
		isTsParent,
		isFilePath: isFilePath(request),
	});

	// It should only try to resolve TS extensions first if it's a local file (non dependency)
	if (isFilePath(request)) {
		const resolvedTsFilename = resolveTsFilename(nextResolve, request, isTsParent);
		if (resolvedTsFilename) {
			return resolvedTsFilename;
		}
	}

	try {
		return nextResolve(request);
	} catch (error) {
		const nodeError = error as NodeError;

		if (nodeError.code === 'MODULE_NOT_FOUND') {
			// Exports map resolution
			if (nodeError.path) {
				const isExportsPath = nodeError.message.match(/^Cannot find module '([^']+)'$/);
				if (isExportsPath) {
					const exportsPath = isExportsPath[1];
					const tsFilename = resolveTsFilename(nextResolve, exportsPath, isTsParent);
					if (tsFilename) {
						return tsFilename;
					}
				}

				const isMainPath = nodeError.message.match(/^Cannot find module '([^']+)'. Please verify that the package.json has a valid "main" entry$/);
				if (isMainPath) {
					const mainPath = isMainPath[1];
					const tsFilename = resolveTsFilename(nextResolve, mainPath, isTsParent);
					if (tsFilename) {
						return tsFilename;
					}
				}
			}

			const resolvedTsFilename = resolveTsFilename(nextResolve, request, isTsParent);
			if (resolvedTsFilename) {
				return resolvedTsFilename;
			}
		}

		throw nodeError;
	}
};
