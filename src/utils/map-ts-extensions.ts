import path from 'node:path';
import {
	isFilePath,
	fileUrlPrefix,
	nodeModulesPath,
	tsExtensionsPattern,
} from './path-utils.js';

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

export const mapTsExtensions = (
	filePath: string,
) => {
	const splitPath = filePath.split('?');
	const pathQuery = splitPath[1] ? `?${splitPath[1]}` : '';
	const [pathname] = splitPath;
	const extension = path.extname(pathname);

	/**
	 * Swappable JS extension (.js/.jsx/.cjs/.mjs): try the TypeScript
	 * equivalents first, then the original (the swap list includes it).
	 *
	 * We intentionally don't also append extensions to the full path
	 * (e.g. `foo.js.ts`) — such files don't exist in practice, and each
	 * non-existent candidate forces Node's resolver to probe a whole family
	 * of paths (extension + directory/index lookups), which is the main
	 * source of redundant fs `stat` calls during resolution.
	 */
	const tryExtensions = tsExtensions[extension];
	if (tryExtensions) {
		const extensionlessPath = pathname.slice(0, -extension.length);
		return tryExtensions.map(
			extension_ => (
				extensionlessPath
				+ extension_
				+ pathQuery
			),
		);
	}

	/**
	 * Explicit TypeScript extension (.ts/.tsx/.cts/.mts): the path already
	 * points at the file, so resolve it as-is instead of appending extensions
	 * (e.g. `foo.ts.ts`). This is the dominant case for projects that import
	 * with explicit extensions, and previously generated only dead candidates.
	 */
	if (tsExtensionsPattern.test(pathname)) {
		return [pathname + pathQuery];
	}

	/**
	 * Otherwise (extensionless, or an unrecognized extension): guess the
	 * extension. Dependencies prioritize .js over .ts.
	 */
	const guessExtensions = (
		(
			!(filePath.startsWith(fileUrlPrefix) || isFilePath(pathname))
			|| pathname.includes(nodeModulesPath)
			|| pathname.includes('/node_modules/') // For file:// URLs on Windows
		)
			? dependencyExtensions
			: localExtensions
	);
	return guessExtensions.map(
		extension_ => (
			pathname
			+ extension_
			+ pathQuery
		),
	);
};
