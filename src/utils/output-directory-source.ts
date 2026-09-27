import path from 'node:path';
import type { TsconfigResult } from 'get-tsconfig';

/**
 * Maps a package imports target inside outDir (or declarationDir) back to
 * its path in rootDir, so the source is used instead of the compiled output
 * https://github.com/privatenumber/tsx/issues/714
 *
 * Mirrors TypeScript's tryLoadInputFileForPath:
 * https://github.com/microsoft/TypeScript/blob/b504a1eed45e35b5f54694a1e0a09f35d0a5663c/src/compiler/moduleNameResolver.ts#L2868
 *
 * Without rootDir, the tsconfig directory is used as the source root
 */
export const getOutputDirectorySourcePath = (
	tsconfig: TsconfigResult,
	targetPath: string,
) => {
	const { compilerOptions } = tsconfig.config;
	if (!compilerOptions) {
		return;
	}

	const configDirectory = path.dirname(tsconfig.path);
	const rootDirectory = path.resolve(configDirectory, compilerOptions.rootDir ?? '.');
	for (const outDirectory of [compilerOptions.declarationDir, compilerOptions.outDir]) {
		if (!outDirectory) {
			continue;
		}

		const relativePath = path.relative(
			path.resolve(configDirectory, outDirectory),
			targetPath,
		);
		if (
			relativePath
			&& !relativePath.startsWith('..')
			&& !path.isAbsolute(relativePath)
		) {
			return path.join(rootDirectory, relativePath);
		}
	}
};
