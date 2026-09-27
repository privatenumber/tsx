import path from 'node:path';
import {
	getTsconfig, isFileIncluded, readTsconfig, type TsconfigResult,
} from 'get-tsconfig';
import { isDependencyPath } from './path-utils.js';

export type TsconfigLookup = {

	/**
	 * tsconfig whose compilerOptions compile the file
	 */
	compile: (filePath: string) => TsconfigResult | undefined;

	/**
	 * tsconfig whose paths & allowJs apply to imports made by the file.
	 * Unlike `compile`, this doesn't require the file to be included, so
	 * scripts outside `include` and virtual files (e.g. [eval]) still
	 * resolve path aliases. Importers without a file path (e.g. REPL,
	 * data: URLs) use the tsconfig of the current working directory.
	 */
	resolve: (importerPath: string | undefined) => TsconfigResult | undefined;
};

const disabledLookup: TsconfigLookup = {
	compile: () => undefined,
	resolve: () => undefined,
};

const safeGetTsconfig: typeof getTsconfig = (...args) => {
	try {
		return getTsconfig(...args);
	} catch {
		// Not warning here for now because it gets warned twice
		// Once by ESM loader and then by CJS loader
	}
};

/**
 * - `false`: tsconfig is disabled
 * - explicit path: that single tsconfig applies
 * - otherwise: each file uses the tsconfig that owns it, like the TypeScript
 *   language server. In a monorepo, each package uses its own tsconfig.
 *   https://github.com/privatenumber/tsx/issues/696
 */
export const createTsconfigLookup = (
	configPath?: string | false,
): TsconfigLookup => {
	if (configPath === false) {
		return disabledLookup;
	}

	if (configPath) {
		const tsconfig = readTsconfig(configPath);
		return {
			compile: filePath => (
				isFileIncluded(tsconfig, filePath)
					? tsconfig
					: undefined
			),
			resolve: () => tsconfig,
		};
	}

	const cache = new Map<string, unknown>();
	return {
		compile: filePath => (
			isDependencyPath(filePath)
				? undefined
				: safeGetTsconfig(filePath, {
					cache,
					includes: true,
				})
		),
		resolve: importerPath => (
			isDependencyPath(importerPath)
				? undefined
				: safeGetTsconfig(
					importerPath ? path.dirname(importerPath) : process.cwd(),
					{ cache },
				)
		),
	};
};
