import path from 'path';
import type { TransformOptions, TransformResult } from 'esbuild';

export const baseConfig = Object.freeze({
	target: `node${process.versions.node}`,

	// "default" tells esbuild to infer loader from file name
	// https://github.com/evanw/esbuild/blob/4a07b17adad23e40cbca7d2f8931e8fb81b47c33/internal/bundler/bundler.go#L158
	loader: 'default',
});

export const cacheConfig = {
	...baseConfig,

	sourcemap: true,

	/**
	 * Smaller output for cache and marginal performance improvement:
	 * https://twitter.com/evanwallace/status/1396336348366180359?s=20
	 *
	 * minifyIdentifiers is disabled because debuggers don't use the
	 * `names` property from the source map
	 *
	 * minifySyntax is disabled because it does some tree-shaking
	 * eg. unused try-catch error variable
	 */
	minifyWhitespace: true,

	// TODO: Is this necessary if minifyIdentifiers is false?
	keepNames: true,
};

export const patchOptions = (
	options: TransformOptions,
) => {
	const originalSourcefile = options.sourcefile;

	if (originalSourcefile) {
		const extension = path.extname(originalSourcefile);

		if (extension) {
			// https://github.com/evanw/esbuild/issues/1932
			if (extension === '.cts' || extension === '.mts') {
				options.sourcefile = `${originalSourcefile.slice(0, -3)}ts`;
			}
		} else {
			// esbuild errors to detect loader when a file doesn't have an extension
			options.sourcefile += '.js';
		}
	}

	return (
		result: TransformResult,
	) => {
		if (options.sourcefile !== originalSourcefile) {
			result.map = result.map.replace(
				JSON.stringify(options.sourcefile),
				JSON.stringify(originalSourcefile),
			);
		}
		return result;
	};
};
