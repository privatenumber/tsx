import { register } from './register.js';

type Options = {
	parentURL: string;
	onImport?: (url: string) => void;
};
const tsImport = (
	specifier: string,
	options: string | Options,
) => {
	if (
		!options
		|| (typeof options === 'object' && !options.parentURL)
	) {
		throw new Error('The current file path (import.meta.url) must be provided in the second argument of tsImport()');
	}

	const isOptionsString = typeof options === 'string';
	const parentURL = isOptionsString ? options : options.parentURL;
	const namespace = Date.now().toString();

	/**
	 * We don't want to unregister this after load since there can be child import() calls
	 * that need TS support
	 *
	 * This is not accessible to others because of the namespace
	 */
	const api = register({
		namespace,
		onImport: (
			isOptionsString
				? undefined
				: options.onImport
		),
	});

	return api.import(specifier, parentURL);
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
