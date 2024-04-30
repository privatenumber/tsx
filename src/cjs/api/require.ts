import path from 'path';
import { fileURLToPath } from 'node:url';
import { register } from './global-require-patch.js';
import { resolveFilename } from './module-resolve-filename.js';

const getRequestContext = (
	filepath: string | URL,
) => {
	if (
		(typeof filepath === 'string' && filepath.startsWith('file://'))
		|| filepath instanceof URL
	) {
		filepath = fileURLToPath(filepath);
	}
	return path.dirname(filepath);
};

const tsxRequire = (
	id: string,
	fromFile: string | URL,
) => {
	const unregister = register();
	try {
		const contextId = path.resolve(getRequestContext(fromFile), id);

		// eslint-disable-next-line import-x/no-dynamic-require, n/global-require
		return require(contextId);
	} finally {
		unregister();
	}
};

const resolve = (
	id: string,
	fromFile: string | URL,
	options?: { paths?: string[] | undefined },
) => {
	const contextId = path.resolve(getRequestContext(fromFile), id);
	return resolveFilename(contextId, module, false, options);
};
resolve.paths = require.resolve.paths;

tsxRequire.resolve = resolve;
tsxRequire.main = require.main;
tsxRequire.extensions = require.extensions;
tsxRequire.cache = require.cache;

export { tsxRequire as require };
