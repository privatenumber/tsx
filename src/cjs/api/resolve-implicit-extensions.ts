import path from 'node:path';
import type { NodeError } from '../../types.js';
import type { ResolveFilename } from './types.js';

export const implicitlyResolvableExtensions = [
	'.ts',
	'.tsx',
	'.jsx',
] as const;

const tryExtensions = (
	resolve: ResolveFilename,
	...args: Parameters<ResolveFilename>
) => {
	for (const extension of implicitlyResolvableExtensions) {
		const newArgs = args.slice() as Parameters<ResolveFilename>;
		newArgs[0] += extension;

		try {
			return resolve(...newArgs);
		} catch {}
	}
};

export const createImplicitResolver = (
	resolve: ResolveFilename,
): ResolveFilename => (
	request,
	...args
) => {
	try {
		return resolve(request, ...args);
	} catch (_error) {
		const nodeError = _error as NodeError;
		if (
			nodeError.code === 'MODULE_NOT_FOUND'
		) {
			const resolved = (
				tryExtensions(resolve, request, ...args)

				// Default resolve handles resovling paths relative to the parent
				|| tryExtensions(resolve, `${request}${path.sep}index`, ...args)
			);
			if (resolved) {
				return resolved;
			}
		}

		throw nodeError;
	}
};
