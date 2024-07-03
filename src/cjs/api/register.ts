import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTsconfig } from '../../utils/tsconfig.js';
import type { RequiredProperty } from '../../types.js';
import { urlSearchParamsStringify } from '../../utils/url-search-params-stringify.js';
import { fileUrlPrefix } from '../../utils/path-utils.js';
import type { LoaderState } from './types.js';
import { createExtensions } from './module-extensions.js';
import { createResolveFilename } from './module-resolve-filename.js';

const resolveContext = (
	id: string,
	fromFile: string | URL,
) => {
	if (!fromFile) {
		throw new Error('The current file path (__filename or import.meta.url) must be provided in the second argument of tsx.require()');
	}

	// If id is not a relative path, it doesn't need to be resolved
	if (!id.startsWith('.')) {
		return id;
	}

	if (
		(typeof fromFile === 'string' && fromFile.startsWith(fileUrlPrefix))
		|| fromFile instanceof URL
	) {
		fromFile = fileURLToPath(fromFile);
	}

	return path.resolve(path.dirname(fromFile), id);
};

type RegisterOptions = {
	namespace?: string;
};

export type Unregister = () => void;

type ScopedRequire = (
	id: string,
	fromFile: string | URL,
) => any; // eslint-disable-line @typescript-eslint/no-explicit-any

type ScopedResolve = (
	id: string,
	fromFile: string | URL,
	resolveOptions?: { paths?: string[] | undefined },
) => string;

export type NamespacedUnregister = Unregister & {
	require: ScopedRequire;
	resolve: ScopedResolve;
	unregister: Unregister;
};

export type Register = {
	(options: RequiredProperty<RegisterOptions, 'namespace'>): NamespacedUnregister;
	(options?: RegisterOptions): Unregister;
};

export const register: Register = (
	options,
) => {
	const { sourceMapsEnabled } = process;
	const state: LoaderState = {
		enabled: true,
	};

	loadTsconfig(process.env.TSX_TSCONFIG_PATH);

	// register
	process.setSourceMapsEnabled(true);

	const originalResolveFilename = Module._resolveFilename;
	const resolveFilename = createResolveFilename(state, originalResolveFilename, options?.namespace);
	Module._resolveFilename = resolveFilename;

	const unregisterExtensions = createExtensions(state, Module._extensions, options?.namespace);

	const unregister = () => {
		if (sourceMapsEnabled === false) {
			process.setSourceMapsEnabled(false);
		}
		state.enabled = false;

		/**
		 * Only revert the _resolveFilename & extensions if they're unwrapped
		 * by another loader extension
		 */
		if (Module._resolveFilename === resolveFilename) {
			Module._resolveFilename = originalResolveFilename;
		}
		unregisterExtensions();
	};

	if (options?.namespace) {
		const scopedRequire: ScopedRequire = (id, fromFile) => {
			const resolvedId = resolveContext(id, fromFile);
			const [request, query] = resolvedId.split('?');

			const parameters = new URLSearchParams(query);
			if (options.namespace && !request.startsWith('node:')) {
				parameters.set('namespace', options.namespace);
			}

			// eslint-disable-next-line n/global-require,import-x/no-dynamic-require
			return require(request + urlSearchParamsStringify(parameters));
		};
		unregister.require = scopedRequire;

		const scopedResolve: ScopedResolve = (id, fromFile, resolveOptions) => {
			const resolvedId = resolveContext(id, fromFile);
			const [request, query] = resolvedId.split('?');

			const parameters = new URLSearchParams(query);
			if (options.namespace && !request.startsWith('node:')) {
				parameters.set('namespace', options.namespace);
			}

			return resolveFilename(
				request + urlSearchParamsStringify(parameters),
				module,
				false,
				resolveOptions,
			);
		};
		unregister.resolve = scopedResolve;
		unregister.unregister = unregister;
	}

	return unregister;
};
