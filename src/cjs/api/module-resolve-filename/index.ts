import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolvePathAlias, type TsconfigResult } from 'get-tsconfig';
import {
	isFilePath,
	fileUrlPrefix,
	tsExtensionsPattern,
	isDependencyPath,
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
		&& !isDependencyPath(parent?.filename)
	) {
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

	const isDependency = isDependencyPath(parent?.filename);
	const resolveBareSpecifiers = Boolean(
		// Namespaced tsx.require() resolves its entire graph as TypeScript.
		namespace

		// If parent is a TS file
		|| (parent?.filename && tsExtensionsPattern.test(parent.filename)),
	);
	const resolveTsExtensions = Boolean(
		resolveBareSpecifiers

		// Project-level allowJs makes local JavaScript source eligible for
		// TypeScript resolution. Published dependencies retain Node's CJS semantics.
		// https://github.com/microsoft/TypeScript-Website/blob/4b665c09b2f57873e6ac0dc9d6d549a5cc61cf9a/packages/tsconfig-reference/copy/en/options/allowJs.md#L3-L39
		|| (
			tsconfig?.config.compilerOptions?.allowJs
			&& !isDependency
		),
	);
	nextResolveSimple = createTsExtensionResolver(
		nextResolveSimple,
		parent?.path ?? undefined,
		resolveTsExtensions,
		resolveBareSpecifiers,
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
