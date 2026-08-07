import path from 'node:path';
import { existsSync } from 'node:fs';
import { getExtensionResolution } from '../../../utils/extension-resolution.js';
import type { NodeError } from '../../../types.js';
import {
	isFilePath,
	isRelativePath,
	isDirectoryPattern,
} from '../../../utils/path-utils.js';
import type { SimpleResolve } from '../types.js';
import { logCjs as log } from '../../../utils/debug.js';

/**
 * Failed resolutions are expensive: Module._findPath stats several
 * implicit extension & index variants before constructing a
 * MODULE_NOT_FOUND error (https://github.com/privatenumber/tsx/issues/809)
 *
 * Skip candidates that can be cheaply confirmed to not exist
 */
const candidateDoesntExist = (
	candidate: string,
	parentPath: string | undefined,
) => {
	let filePath: string | undefined;
	if (path.isAbsolute(candidate)) {
		filePath = candidate;
	} else if (isRelativePath(candidate) && parentPath) {
		filePath = path.resolve(parentPath, candidate);
	}
	return filePath !== undefined && !existsSync(filePath);
};

/**
 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
 */
const resolveTsFilename = (
	resolve: SimpleResolve,
	request: string,
	parentPath: string | undefined,
	resolveBareSpecifier: boolean,
) => {
	log(3, 'resolveTsFilename', {
		request,
		isDirectory: isDirectoryPattern.test(request),
	});
	if (
		isDirectoryPattern.test(request)
	) {
		return;
	}

	const tryPaths = getExtensionResolution(request, resolveBareSpecifier);
	if (!tryPaths) {
		return;
	}

	for (const tryTsPath of tryPaths) {
		if (candidateDoesntExist(tryTsPath, parentPath)) {
			continue;
		}

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
	parentPath: string | undefined,
	resolveTsExtensions: boolean,
	resolveBareSpecifier: boolean,
): SimpleResolve => (
	request,
) => {
	log(3, 'resolveTsFilename', {
		request,
		resolveTsExtensions,
		isFilePath: isFilePath(request),
	});

	if (resolveTsExtensions && isFilePath(request)) {
		const resolvedTsFilename = resolveTsFilename(
			nextResolve,
			request,
			parentPath,
			resolveBareSpecifier,
		);
		if (resolvedTsFilename) {
			return resolvedTsFilename;
		}
	}

	try {
		return nextResolve(request);
	} catch (error) {
		const nodeError = error as NodeError;

		if (resolveTsExtensions && nodeError.code === 'MODULE_NOT_FOUND') {
			// Exports map resolution
			if (nodeError.path) {
				const isExportsPath = nodeError.message.match(/^Cannot find module '([^']+)'$/);
				if (isExportsPath) {
					const exportsPath = isExportsPath[1];
					const tsFilename = resolveTsFilename(
						nextResolve,
						exportsPath,
						parentPath,
						resolveBareSpecifier,
					);
					if (tsFilename) {
						return tsFilename;
					}
				}

				const isMainPath = nodeError.message.match(/^Cannot find module '([^']+)'. Please verify that the package.json has a valid "main" entry$/);
				if (isMainPath) {
					const mainPath = isMainPath[1];
					const tsFilename = resolveTsFilename(
						nextResolve,
						mainPath,
						parentPath,
						resolveBareSpecifier,
					);
					if (tsFilename) {
						return tsFilename;
					}
				}
			}

			const resolvedTsFilename = resolveTsFilename(
				nextResolve,
				request,
				parentPath,
				resolveBareSpecifier,
			);
			if (resolvedTsFilename) {
				return resolvedTsFilename;
			}
		}

		throw nodeError;
	}
};
