import path from 'node:path';
import { isFilePath, fileUrlPrefix, nodeModulesPath } from './path-utils.js';

const implicitJsExtensions = ['.js', '.json'];
const implicitTsExtensions = ['.ts', '.tsx', '.jsx'];
const nodeAssetExtensions = new Set(['.json', '.node']);

// Guess extension
const localExtensions = [...implicitTsExtensions, ...implicitJsExtensions];

// Published JavaScript is more likely to work than source TypeScript because
// its tsconfig and extended configs may not be published.
// https://github.com/evanw/esbuild/releases/tag/v0.20.0
const dependencyExtensions = [...implicitJsExtensions, ...implicitTsExtensions];

// TypeScript substitutes emitted JavaScript extensions to find source files.
// https://github.com/microsoft/TypeScript-Website/blob/e5652f43f20bf13a1671051de4dbf67eac73d6e1/packages/documentation/copy/en/modules-reference/Reference.md#L552-L570
const tsExtensions: Record<string, string[]> = Object.create(null);
tsExtensions['.js'] = ['.ts', '.tsx', '.js', '.jsx'];
tsExtensions['.jsx'] = ['.tsx', '.ts', '.jsx', '.js'];
tsExtensions['.cjs'] = ['.cts'];
tsExtensions['.mjs'] = ['.mts'];

/**
 * TypeScript resolves these extensions verbatim, so there are no
 * alternative paths to try. Guessing appended extensions for them
 * (e.g. `file.ts` -> `file.ts.ts`) only produces misses, and each
 * miss is expensive: Node decorates ERR_MODULE_NOT_FOUND with a
 * CommonJS resolution hint, which re-enters the (tsx-patched)
 * CJS resolver (https://github.com/privatenumber/tsx/issues/809)
 *
 * This mirrors esbuild's model, which separates "TypeScript's file
 * extension swapping" (`.js` -> `.ts`, only for known JS extensions)
 * from "node's implicit file extension searching" (appending to an
 * extension-less path). Neither appends onto an existing extension,
 * so neither produces `file.ts.ts`.
 * https://github.com/evanw/esbuild/issues/3201
 */
const verbatimExtensions = new Set(['.ts', '.tsx', '.mts', '.cts']);

export const getExtensionResolution = (
	filePath: string,
	resolveBareSpecifier = false,
) => {
	const queryIndex = filePath.indexOf('?');
	const pathname = queryIndex === -1 ? filePath : filePath.slice(0, queryIndex);
	const pathQuery = queryIndex === -1 ? '' : filePath.slice(queryIndex);
	// JavaScript parents use Node's LOAD_NODE_MODULES algorithm unchanged.
	// TypeScript and namespaced tsx.require() parents retain TypeScript's
	// substitution behavior for package subpaths.
	// https://github.com/nodejs/node/blob/v18.20.8/doc/api/modules.md#L227-L232
	if (
		!resolveBareSpecifier
		&& !isFilePath(pathname)
		&& !pathname.startsWith(fileUrlPrefix)
	) {
		return;
	}

	const extension = path.extname(pathname);

	if (verbatimExtensions.has(extension)) {
		return;
	}

	const substitutionExtensions = tsExtensions[extension];
	if (substitutionExtensions) {
		const extensionlessPath = pathname.slice(0, -extension.length);

		return substitutionExtensions.map(
			extension_ => (
				extensionlessPath
				+ extension_
				+ pathQuery
			),
		);
	}

	// JSON and native module paths belong to Node. CommonJS first checks the
	// exact path, then applies its own .js/.json/.node fallback sequence.
	// https://github.com/nodejs/node/blob/v18.20.8/doc/api/modules.md#L205-L209
	if (nodeAssetExtensions.has(extension)) {
		return;
	}

	const implicitExtensions = (
		(
			!(filePath.startsWith(fileUrlPrefix) || isFilePath(pathname))
			|| pathname.includes(nodeModulesPath)
			|| pathname.includes('/node_modules/') // For file:// URLs on Windows
		)
			? dependencyExtensions
			: localExtensions
	);
	return implicitExtensions.map(
		extension_ => (
			pathname
			+ extension_
			+ pathQuery
		),
	);
};
