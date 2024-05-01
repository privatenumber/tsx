import { register } from './register';

const resolveSpecifier = (
	specifier: string,
	fromFile: string,
) => {
	if (!fromFile || !fromFile.startsWith('file://')) {
		throw new Error('The current file path (import.meta.url) must be provided in the second argument of tsImport()');
	}
	const resolvedUrl = new URL(specifier, fromFile).toString();
	return resolvedUrl;
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
