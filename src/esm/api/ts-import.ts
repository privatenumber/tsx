import { register as cjsRegister } from '../../cjs/api/index.js';
import { isFeatureSupported, esmLoadReadFile } from '../../utils/node-features.js';
import { register, type TsconfigOptions } from './register.js';

type Options = {
	parentURL: string;
	onImport?: (url: string) => void;
	tsconfig?: TsconfigOptions;
};

const commonjsPattern = /[/\\].+\.(?:cts|cjs)(?:$|\?)/;
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

	// Keep registered for hanging require() calls
	const cjs = cjsRegister({
		namespace,
	});

	/**
	 * In Node v18, the loader doesn't support reading the CommonJS from
	 * a data URL, so it can't actually relay the namespace. This is a workaround
	 * to preemptively determine whether the file is a CommonJS file, and shortcut
	 * to using the CommonJS loader instead of going through the ESM loader first
	 */
	if (
		!isFeatureSupported(esmLoadReadFile)
		&& commonjsPattern.test(specifier)
	) {
		return Promise.resolve(cjs.require(specifier, parentURL));
	}

	/**
	 * We don't want to unregister this after load since there can be child import() calls
	 * that need TS support
	 *
	 * This is not accessible to others because of the namespace
	 */
	const api = register({
		namespace,
		...(
			isOptionsString
				? {}
				: options
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
