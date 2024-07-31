import path from 'node:path';
import Module from 'node:module';
import { urlSearchParamsStringify } from '../../../utils/url-search-params-stringify.js';
import { isFromCjsLexer } from './is-from-cjs-lexer.js';
import { getOriginalFilePath } from './interop-cjs-exports.js';

export const preserveQuery = (
	request: string,
	parent?: Module.Parent,
) => {
	// Strip query string
	const requestAndQuery = request.split('?');
	const searchParams = new URLSearchParams(requestAndQuery[1]);

	if (parent?.filename) {
		const filePath = getOriginalFilePath(parent.filename);
		let query: string | undefined;
		if (filePath) {
			const pathAndQuery = filePath.split('?');
			const newFilename = pathAndQuery[0];
			query = pathAndQuery[1];

			/**
			 * Can't delete the old cache entry because there's an assertion
			 * https://github.com/nodejs/node/blob/v20.15.0/lib/internal/modules/esm/translators.js#L347
			 */
			// delete Module._cache[parent.filename];

			parent.filename = newFilename;
			parent.path = path.dirname(newFilename);
			// https://github.com/nodejs/node/blob/v20.15.0/lib/internal/modules/esm/translators.js#L383
			parent.paths = Module._nodeModulePaths(parent.path);

			Module._cache[newFilename] = parent as NodeModule;
		}

		if (!query) {
			query = parent.filename.split('?')[1];
		}

		// Inherit parent namespace if it exists
		const parentQuery = new URLSearchParams(query);
		const parentNamespace = parentQuery.get('namespace');
		if (parentNamespace) {
			searchParams.append('namespace', parentNamespace);
		}
	}

	return [
		requestAndQuery[0],
		searchParams,
		(
			resolved: string,
			restOfArgsLength: number,
		) => {
			// Only add query back if it's a file path (not a core Node module)
			if (
				path.isAbsolute(resolved)

				// These two have native loaders which don't support queries
				&& !resolved.endsWith('.json')
				&& !resolved.endsWith('.node')

				/**
				 * Detect if this is called by the CJS lexer, the resolved path is directly passed into
				 * readFile to parse the exports
				 */
				&& !(
					// Only the CJS lexer doesn't pass in the rest of the arguments
					// https://github.com/nodejs/node/blob/v20.15.0/lib/internal/modules/esm/translators.js#L415
					restOfArgsLength === 0
					// eslint-disable-next-line unicorn/error-message
					&& isFromCjsLexer(new Error())
				)
			) {
				resolved += urlSearchParamsStringify(searchParams);
			}

			return resolved;
		},
	] as const;
};
