import { pathToFileURL } from 'node:url';
import { register } from './register.js';

const resolveSpecifier = (
	specifier: string,
	fromFile: string,
	namespace: string,
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

	/**
	 * A namespace query is added so we get our own module cache
	 *
	 * I considered using an import attribute for this, but it doesn't seem to
	 * make the request unique so it gets cached.
	 */
	resolvedUrl.searchParams.set('tsx-namespace', namespace);

	return resolvedUrl.toString();
};

const tsImport = (
	specifier: string,
	fromFile: string,
) => {
	const namespace = Date.now().toString();
	const resolvedUrl = resolveSpecifier(specifier, fromFile, namespace);

	/**
	 * We don't want to unregister this after load since there can be child import() calls
	 * that need TS support
	 *
	 * This is not accessible to others because of the namespace
	 */
	register({ namespace });
	return import(resolvedUrl);
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
