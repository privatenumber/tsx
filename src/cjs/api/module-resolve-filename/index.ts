import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import type { TsconfigResult } from 'get-tsconfig';
import {
	isFilePath,
	fileUrlPrefix,
	tsExtensionsPattern,
	nodeModulesPath,
} from '../../../utils/path-utils.js';
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
	tsconfig: TsconfigResult | undefined,
) => {
	// Support file protocol
	if (request.startsWith(fileUrlPrefix)) {
		request = fileURLToPath(request);
	}

	// Resolve TS path alias
	if (
		tsconfig

		// bare specifier
		&& !isFilePath(request)

		// Dependency paths should not be resolved using tsconfig.json
		&& !parent?.filename?.includes(nodeModulesPath)
	) {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const { resolvePathAlias } = require('get-tsconfig') as typeof import('get-tsconfig');
		const possiblePaths = resolvePathAlias(tsconfig, request);
		for (const possiblePath of possiblePaths) {
			try {
				return nextResolve(possiblePath);
			} catch {}
		}
	}

	return nextResolve(request);
};

export const createResolveFilename = (
	state: LoaderState,
	nextResolve: ResolveFilename,
	tsconfig: TsconfigResult | undefined,
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
		tsconfig?.config.compilerOptions?.allowJs ?? false,
	);

	nextResolveSimple = createImplicitResolver(nextResolveSimple);

	const resolved = appendQuery(
		resolveTsPaths(cleanRequest, parent, nextResolveSimple, tsconfig),
		restOfArgs.length,
	);

	log(1, 'resolved', {
		request,
		parent: parent?.filename ?? parent,
		resolved,
	});

	return resolved;
};
