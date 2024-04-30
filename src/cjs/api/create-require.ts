import path from 'path';
import Module from 'module';
import { fileURLToPath } from 'url';
import { isWindows } from '../../utils/is-windows.js';
import { extensions } from './module-extensions.js';
import { resolveFilename } from './module-resolve-filename.js';

const isURL = (
	self: URL | string,
): self is URL => Boolean(
	typeof self === 'object'
	&& self?.href
	&& self.protocol
	&& (!('auth' in self) || self.auth === undefined)
	&& (!('path' in self) || self.path === undefined),
);

const createRequireError = 'filename must be a file URL object, file URL string, or absolute path string';

/**
 * From Node:
 * https://github.com/nodejs/node/blob/7c3dce0e4f296d863a3f9e4cdbadaee8b0280f79/lib/internal/modules/cjs/loader.js#L1620-L1643
 */
export const createRequire = (
	filename: string | URL,
) => {
	if (!filename) {
		throw new Error(createRequireError);
	}

	if (
		(typeof filename === 'string' && !path.isAbsolute(filename))
		|| isURL(filename)
	) {
		try {
			filename = fileURLToPath(filename);
		} catch {
			throw new Error(createRequireError);
		}
	}

	// Allow a directory to be passed as the filename
	const trailingSlash = filename.endsWith('/') || (isWindows && filename.endsWith('\\'));

	const proxyPath = trailingSlash
		? path.join(filename, 'noop.js')
		: filename;

	const m = new Module(proxyPath);
	m.filename = proxyPath;
	m.paths = Module._nodeModulePaths(m.path);

	const resolve: NodeRequire['resolve'] = (request, options) => resolveFilename(request, m, false, options);
	resolve.paths = request => Module._resolveLookupPaths(request, m);

	const require: NodeRequire = requirePath => m.require(requirePath);
	require.resolve = resolve;
	require.main = process.mainModule;
	require.extensions = extensions;
	require.cache = Module._cache;

	return require;
};
