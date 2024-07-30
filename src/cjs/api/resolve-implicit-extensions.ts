import path from 'node:path';
import type { NodeError } from '../../types.js';
import { isDirectoryPattern } from '../../utils/path-utils.js';
import { mapTsExtensions } from '../../utils/map-ts-extensions.js';
import type { ResolveFilename } from './types.js';

const tryExtensions = (
	resolve: ResolveFilename,
	...args: Parameters<ResolveFilename>
) => {
	const tryPaths = mapTsExtensions(args[0]);
	for (const tryPath of tryPaths) {
		const newArgs = args.slice() as Parameters<ResolveFilename>;
		newArgs[0] = tryPath;

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
	if (request === '.') {
		request = './';
	}

	/**
	 * Currently, there's an edge case where it doesn't resolve index.ts over index.js
	 * if the request doesn't end with a slash. e.g. `import './dir'`
	 * Doesn't handle '.' either
	 */
	if (isDirectoryPattern.test(request)) {
		// If directory, can be index.js, index.ts, etc.
		let joinedPath = path.join(request, 'index');

		/**
		 * path.join will remove the './' prefix if it exists
		 * but it should only be added back if it was there before
		 * (e.g. not package directory imports)
		 */
		if (request.startsWith('./')) {
			joinedPath = `./${joinedPath}`;
		}

		const resolved = tryExtensions(resolve, joinedPath, ...args);
		if (resolved) {
			return resolved;
		}
	}

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
