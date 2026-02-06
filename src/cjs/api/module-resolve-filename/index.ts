import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import type { NodeError } from '../../../types.js';
import {
	isFilePath,
	fileUrlPrefix,
	tsExtensionsPattern,
	nodeModulesPath,
} from '../../../utils/path-utils.js';
import { tsconfigPathsMatcher } from '../../../utils/tsconfig.js';
import { enhanceModuleError } from '../../../utils/enhance-module-error.js';
import type { ResolveFilename, SimpleResolve, LoaderState } from '../types.js';
import { logCjs as log } from '../../../utils/debug.js';
import { createImplicitResolver } from './resolve-implicit-extensions.js';
import { interopCjsExports } from './interop-cjs-exports.js';
import { createTsExtensionResolver } from './resolve-ts-extensions.js';
import { preserveQuery } from './preserve-query.js';

const resolveTsPaths = (
	request: string,
	parent: Module.Parent | undefined,
	nextResolve: SimpleResolve,
) => {
	// Support file protocol
	if (request.startsWith(fileUrlPrefix)) {
		request = fileURLToPath(request);
	}

	// Track searched paths for better error messages
	const searchedPaths: string[] = [];

	// Resolve TS path alias
	if (
		tsconfigPathsMatcher

		// bare specifier
		&& !isFilePath(request)

		// Dependency paths should not be resolved using tsconfig.json
		&& !parent?.filename?.includes(nodeModulesPath)
	) {
		const possiblePaths = tsconfigPathsMatcher(request);
		for (const possiblePath of possiblePaths) {
			searchedPaths.push(possiblePath);
			try {
				return nextResolve(possiblePath);
			} catch {}
		}
	}

	try {
		return nextResolve(request);
	} catch (error) {
		if (
			error instanceof Error
			&& searchedPaths.length > 0
		) {
			throw enhanceModuleError(error as NodeError, searchedPaths);
		}
		throw error;
	}
};

export const createResolveFilename = (
	state: LoaderState,
	nextResolve: ResolveFilename,
	namespace?: string,
): ResolveFilename => (
	request,
	parent,
	...restOfArgs
) => {
	if (state.enabled === false) {
		return nextResolve(request, parent, ...restOfArgs);
	}

	request = interopCjsExports(request);

	const [
		cleanRequest,
		searchParams,
		appendQuery,
	] = preserveQuery(request, parent);

	// If request namespace doesnt match the namespace, ignore
	if ((searchParams.get('namespace') ?? undefined) !== namespace) {
		return nextResolve(request, parent, ...restOfArgs);
	}

	log(2, 'resolve', {
		request,
		parent: parent?.filename ?? parent,
		restOfArgs,
	});

	let nextResolveSimple: SimpleResolve = request_ => nextResolve(
		request_,
		parent,
		...restOfArgs,
	);

	nextResolveSimple = createTsExtensionResolver(
		nextResolveSimple,
		Boolean(
			// If register.namespace is used (e.g. tsx.require())
			namespace

			// If parent is a TS file
			|| (parent?.filename && tsExtensionsPattern.test(parent.filename)),
		),
	);

	nextResolveSimple = createImplicitResolver(nextResolveSimple);

	const resolved = appendQuery(
		resolveTsPaths(cleanRequest, parent, nextResolveSimple),
		restOfArgs.length,
	);

	log(1, 'resolved', {
		request,
		parent: parent?.filename ?? parent,
		resolved,
	});

	return resolved;
};
