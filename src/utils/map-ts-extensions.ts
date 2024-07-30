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

export const mapTsExtensions = (
	filePath: string,
) => {
	const splitPath = filePath.split('?');
	const pathQuery = splitPath[1] ? `?${splitPath[1]}` : '';
	const [pathname] = splitPath;
	const extension = path.extname(pathname);

	const tryPaths: string[] = [];

	const tryExtensions = tsExtensions[extension];
	if (tryExtensions) {
		const extensionlessPath = pathname.slice(0, -extension.length);

		tryPaths.push(
			...tryExtensions.map(
				extension_ => (
					extensionlessPath
					+ extension_
					+ pathQuery
				),
			),
		);
	}

	const guessExtensions = (
		(
			!(filePath.startsWith(fileUrlPrefix) || isFilePath(pathname))
			|| pathname.includes(nodeModulesPath)
			|| pathname.includes('/node_modules/') // For file:// URLs on Windows
		)
			? dependencyExtensions
			: localExtensions
	);
	tryPaths.push(
		...guessExtensions.map(
			extension_ => (
				pathname
				+ extension_
				+ pathQuery
			),
		),
	);

	return tryPaths;
};
