import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTsconfig } from '../../utils/tsconfig.js';
import type { RequiredProperty } from '../../types.js';
import { urlSearchParamsStringify } from '../../utils/url-search-params-stringify.js';
import { createExtensions } from './module-extensions.js';
import { createResolveFilename } from './module-resolve-filename.js';

const resolveContext = (
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
	const { _extensions, _resolveFilename } = Module;

	loadTsconfig(process.env.TSX_TSCONFIG_PATH);

	// register
	process.setSourceMapsEnabled(true);
	const resolveFilename = createResolveFilename(_resolveFilename, options?.namespace);
	Module._resolveFilename = resolveFilename;

	const extensions = createExtensions(Module._extensions, options?.namespace);
	// @ts-expect-error overwriting read-only property
	Module._extensions = extensions;

	const unregister = () => {
		if (sourceMapsEnabled === false) {
			process.setSourceMapsEnabled(false);
		}

		// @ts-expect-error overwriting read-only property
		Module._extensions = _extensions;
		Module._resolveFilename = _resolveFilename;
	};

	if (options?.namespace) {
		const scopedRequire: ScopedRequire = (id, fromFile) => {
			const resolvedId = resolveContext(id, fromFile);
			const [request, query] = resolvedId.split('?');

			const parameters = new URLSearchParams(query);
			if (options.namespace) {
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
			if (options.namespace) {
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
