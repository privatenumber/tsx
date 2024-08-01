import path from 'node:path';
import type { NodeError } from '../../../types.js';
import { isDirectoryPattern } from '../../../utils/path-utils.js';
import type { SimpleResolve } from '../types.js';

/**
 * Custom re-implementation of the CommonJS implicit resolver
 *
 * - Resolves .ts over .js extensions
 * - When namespaced, the loaders are registered to the extensions in a hidden way
 * so Node's built-in implicit resolver will not try those extensions
 */
export const createImplicitResolver = (
	nextResolve: SimpleResolve,
): SimpleResolve => (
	request,
) => {
	if (request === '.' || request === '..' || request.endsWith('/..')) {
		request += '/';
	}

	/**
	 * Currently, there's an edge case where it doesn't resolve index.ts over index.js
	 * if the request doesn't end with a slash. e.g. `import './dir'`
	 * Doesn't handle '.' either
	 */
	if (isDirectoryPattern.test(request)) {
		// If directory, can be index.js, index.ts, etc.
		let joinedPath = path.join(request, 'index.js');

		/**
		 * path.join will remove the './' prefix if it exists
		 * but it should only be added back if it was there before
		 * (e.g. not package directory imports)
		 */
		if (request.startsWith('./')) {
			joinedPath = `./${joinedPath}`;
		}

		try {
			return nextResolve(joinedPath);
		} catch {}
	}

	try {
		return nextResolve(request);
	} catch (_error) {
		const nodeError = _error as NodeError;

		if (nodeError.code === 'MODULE_NOT_FOUND') {
			try {
				return nextResolve(`${request}${path.sep}index.js`);
			} catch {}
		}

		throw nodeError;
	}
};
