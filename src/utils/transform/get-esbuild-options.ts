import path from 'path';
import type { TransformOptions, TransformResult } from 'esbuild';
import type { SourceMap } from './apply-transformers.js';

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
	 * Improve performance by generating smaller source maps
	 * that doesn't include the original source code
	 *
	 * https://esbuild.github.io/api/#sources-content
	 */
	sourcesContent: false,

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

	/**
	 * esbuild renames variables even if minification is not enabled
	 * https://esbuild.github.io/try/#dAAwLjE5LjUAAGNvbnN0IGEgPSAxOwooZnVuY3Rpb24gYSgpIHt9KTs
	 */
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
		if (result.map) {
			if (options.sourcefile !== originalSourcefile) {
				result.map = result.map.replace(
					JSON.stringify(options.sourcefile),
					JSON.stringify(originalSourcefile),
				);
			}

			result.map = JSON.parse(result.map);
		}

		return result as TransformResult & { map: SourceMap };
	};
};
