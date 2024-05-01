import { pathToFileURL } from 'node:url';
import { register } from './register';

const resolveSpecifier = (
	specifier: string,
	fromFile: string,
) => {
	if (!fromFile) {
		throw new Error('The current file path (import.meta.url) must be provided in the second argument of tsImport()');
	}

	const base = (
		fromFile.startsWith('file://')
			? fromFile
			: pathToFileURL(fromFile)
	);
	const resolvedUrl = new URL(specifier, base);

	// A namespace query is added so we get our own module cache
	resolvedUrl.searchParams.set('tsx', '');

	return resolvedUrl.toString();
};

const tsImport = (
	specifier: string,
	fromFile: string,
) => {
	const resolvedUrl = resolveSpecifier(specifier, fromFile);
	const unregister = register();
	return import(resolvedUrl).finally(() => unregister());
};

/**
 * Considered implmenting import.meta.resolve(), but natively, it doesn't seem to actully
 * resolve relative file paths.
 *
 * For example, this doesn't throw: import.meta.resolve('./missing-file')
 */
// tsImport.meta = {
// 	resolve: (
// 		specifier: string,
// 		fromFile: string,
// 	) => {
// 		const resolvedUrl = resolveSpecifier(specifier, fromFile);
// 		const unregister = register();
// 		try {
// 			return import.meta.resolve(resolvedUrl);
// 		} finally {
// 			unregister();
// 		}
// 	}
// };

export { tsImport };
