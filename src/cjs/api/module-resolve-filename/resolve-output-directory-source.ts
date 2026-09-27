import type { TsconfigResult } from 'get-tsconfig';
import type { NodeError } from '../../../types.js';
import { getOutputDirectorySourcePath } from '../../../utils/output-directory-source.js';
import type { SimpleResolve } from '../types.js';

/**
 * Like TypeScript, package imports (#) targeting outDir resolve to the rootDir
 * source first, so a stale build isn't loaded
 */
export const resolveOutputDirectorySource = (
	request: string,
	importerPath: string | null | undefined,
	tsconfig: TsconfigResult | undefined,
	resolve: SimpleResolve,
) => {
	if (!importerPath || !tsconfig || !request.startsWith('#')) {
		return;
	}

	let targetPath: string | undefined;
	try {
		targetPath = resolve(request);
	} catch (error) {
		const nodeError = error as NodeError;
		if (nodeError.code !== 'MODULE_NOT_FOUND') {
			return;
		}
		targetPath = nodeError.message.match(/^Cannot find module '([^']+)'/)?.[1];
	}

	const sourcePath = targetPath && getOutputDirectorySourcePath(tsconfig, targetPath, importerPath);
	if (!sourcePath) {
		return;
	}

	try {
		return resolve(sourcePath);
	} catch {}
};
