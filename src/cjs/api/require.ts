import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from './register.js';
import { createResolveFilename } from './module-resolve-filename.js';

const getRequestContext = (
	id: string,
	fromFile: string | URL,
) => {
	if (!fromFile) {
		throw new Error('The current file path (__filename or import.meta.url) must be provided in the second argument of tsx.require()');
	}

	if (
		(typeof fromFile === 'string' && fromFile.startsWith('file://'))
		|| fromFile instanceof URL
	) {
		fromFile = fileURLToPath(fromFile);
	}

	return path.resolve(path.dirname(fromFile), id);
};

const tsxRequire = (
	id: string,
	fromFile: string | URL,
) => {
	const contextId = getRequestContext(id, fromFile);
	const unregister = register();
	try {
		// eslint-disable-next-line import-x/no-dynamic-require, n/global-require
		return require(contextId);
	} finally {
		unregister();
	}
};

const resolveFilename = createResolveFilename(Module._resolveFilename);

const resolve = (
	id: string,
	fromFile: string | URL,
	options?: { paths?: string[] | undefined },
) => {
	const contextId = getRequestContext(id, fromFile);
	return resolveFilename(contextId, module, false, options);
};
resolve.paths = require.resolve.paths;

tsxRequire.resolve = resolve;
tsxRequire.main = require.main;
tsxRequire.extensions = require.extensions;
tsxRequire.cache = require.cache;

export { tsxRequire as require };
