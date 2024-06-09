import path from 'node:path';
import type { NodeError } from '../../types.js';
import type { SimpleResolve } from './types.js';

export const implicitlyResolvableExtensions = [
	'.ts',
	'.tsx',
	'.jsx',
] as const;

const tryExtensions = (
	resolve: SimpleResolve,
	request: string,
) => {
	for (const extension of implicitlyResolvableExtensions) {
		try {
			return resolve(request + extension);
		} catch {}
	}
};

export const createImplicitResolver = (
	resolve: SimpleResolve,
): SimpleResolve => (request) => {
	try {
		return resolve(request);
	} catch (_error) {
		const nodeError = _error as NodeError;
		if (
			nodeError.code === 'MODULE_NOT_FOUND'
		) {
			const resolved = (
				tryExtensions(resolve, request)

				// Default resolve handles resovling paths relative to the parent
				|| tryExtensions(resolve, `${request}${path.sep}index`)
			);
			if (resolved) {
				return resolved;
			}
		}

		throw nodeError;
	}
};
