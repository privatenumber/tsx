import fs from 'node:fs';
import path from 'node:path';
import type { TsconfigResult } from 'get-tsconfig';
import { isDependencyPath } from './path-utils.js';

const isPathInside = (
	directoryPath: string,
	filePath: string,
) => {
	const relativePath = path.relative(directoryPath, filePath);
	return (
		relativePath !== ''
		&& !relativePath.startsWith('..')
		&& !path.isAbsolute(relativePath)
	);
};

// Package scope of `#` imports: the nearest directory with a package.json
const getPackageDirectory = (
	filePath: string,
) => {
	let directoryPath = path.dirname(filePath);
	while (!fs.existsSync(path.join(directoryPath, 'package.json'))) {
		const parentPath = path.dirname(directoryPath);
		if (parentPath === directoryPath) {
			return;
		}
		directoryPath = parentPath;
	}
	return directoryPath;
};

/**
 * Maps a package imports target inside outDir (or declarationDir) back to
 * its path in rootDir, so the source is used instead of the compiled output
 * https://github.com/privatenumber/tsx/issues/714
 *
 * Mirrors TypeScript's tryLoadInputFileForPath, which only maps targets
 * outside node_modules, using a tsconfig inside the importing package:
 * https://github.com/microsoft/TypeScript/blob/b504a1eed45e35b5f54694a1e0a09f35d0a5663c/src/compiler/moduleNameResolver.ts#L2868
 *
 * Without rootDir, the tsconfig directory is used as the source root
 */
export const getOutputDirectorySourcePath = (
	tsconfig: TsconfigResult,
	targetPath: string,
	importerPath: string,
) => {
	const { compilerOptions } = tsconfig.config;
	if (!compilerOptions || isDependencyPath(targetPath)) {
		return;
	}

	const packageDirectory = getPackageDirectory(importerPath);
	if (!packageDirectory || !isPathInside(packageDirectory, tsconfig.path)) {
		return;
	}

	const configDirectory = path.dirname(tsconfig.path);
	const rootDirectory = path.resolve(configDirectory, compilerOptions.rootDir ?? '.');
	for (const outDirectory of [compilerOptions.declarationDir, compilerOptions.outDir]) {
		if (!outDirectory) {
			continue;
		}

		const outDirectoryPath = path.resolve(configDirectory, outDirectory);
		if (isPathInside(outDirectoryPath, targetPath)) {
			return path.join(rootDirectory, path.relative(outDirectoryPath, targetPath));
		}
	}
};
