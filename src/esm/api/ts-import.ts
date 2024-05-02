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

type Options = {
	parentURL: string;
	onImport?: (url: string) => void;
};
const tsImport = (
	specifier: string,
	options: string | Options,
) => {
	const isOptionsString = typeof options === 'string';
	const parentURL = isOptionsString ? options : options.parentURL;
	const namespace = Date.now().toString();
	const resolvedUrl = resolveSpecifier(specifier, parentURL, namespace);

	/**
	 * We don't want to unregister this after load since there can be child import() calls
	 * that need TS support
	 *
	 * This is not accessible to others because of the namespace
	 */
	register({
		namespace,
		onImport: isOptionsString ? undefined : options.onImport,
	});
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
