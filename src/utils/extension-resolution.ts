import path from 'node:path';
import { isFilePath, fileUrlPrefix, nodeModulesPath } from './path-utils.js';

const implicitJsExtensions = ['.js', '.json'];
const implicitTsExtensions = ['.ts', '.tsx', '.jsx'];

// Guess extension
const localExtensions = [...implicitTsExtensions, ...implicitJsExtensions];

/**
 * If dependency, prioritize .js extensions over .ts
 *
 * .js is more likely to behave correctly than the .ts file
 * https://github.com/evanw/esbuild/releases/tag/v0.20.0
 */
const dependencyExtensions = [...implicitJsExtensions, ...implicitTsExtensions];

// Swap extension
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
) => {
	const splitPath = filePath.split('?');
	const pathQuery = splitPath[1] ? `?${splitPath[1]}` : '';
	const [pathname] = splitPath;
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
