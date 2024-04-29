import Module from 'module';
import {
	createPathsMatcher,
} from 'get-tsconfig';
import { resolveTsPath } from '../utils/resolve-ts-path.js';
import type { NodeError } from '../types.js';
import {
	isRelativePathPattern,
	isTsFilePatten,
	nodeModulesPath,
	tsconfig,
} from './utils.js';

const tsconfigPathsMatcher = tsconfig && createPathsMatcher(tsconfig);

type Resolver = typeof Module._resolveFilename;

export const patchResolve = (
	defaultResolver: Resolver,
): Resolver => {

	/**
	 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
	 */
	const resolveTsFilename = (
		request: string,
		parent: Module.Parent,
		isMain: boolean,
		options?: Record<PropertyKey, unknown>,
	) => {
		const tsPath = resolveTsPath(request);

		if (
			parent?.filename
			&& (
				isTsFilePatten.test(parent.filename)
				|| tsconfig?.config.compilerOptions?.allowJs
			)
			&& tsPath
		) {
			for (const tryTsPath of tsPath) {
				try {
					return defaultResolver(
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
		}
	};

	return (request, parent, isMain, options) => {
		// Strip query string
		const queryIndex = request.indexOf('?');
		if (queryIndex !== -1) {
			request = request.slice(0, queryIndex);
		}
	
		if (
			tsconfigPathsMatcher
	
			// bare specifier
			&& !isRelativePathPattern.test(request)
	
			// Dependency paths should not be resolved using tsconfig.json
			&& !parent?.filename?.includes(nodeModulesPath)
		) {
			const possiblePaths = tsconfigPathsMatcher(request);
	
			for (const possiblePath of possiblePaths) {
				const tsFilename = resolveTsFilename(possiblePath, parent, isMain, options);
				if (tsFilename) {
					return tsFilename;
				}
	
				try {
					return defaultResolver(
						possiblePath,
						parent,
						isMain,
						options,
					);
				} catch {}
			}
		}
	
		const tsFilename = resolveTsFilename(request, parent, isMain, options);
		if (tsFilename) {
			return tsFilename;
		}
	
		return defaultResolver(request, parent, isMain, options);
	};
};
