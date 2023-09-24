import path from 'path';
import type { TransformOptions } from 'esbuild';

const nodeVersion = process.versions.node;

export const getEsbuildOptions = (
	extendOptions: TransformOptions,
) => {
	const options: TransformOptions = {
		target: `node${nodeVersion}`,

		// "default" tells esbuild to infer loader from file name
		// https://github.com/evanw/esbuild/blob/4a07b17adad23e40cbca7d2f8931e8fb81b47c33/internal/bundler/bundler.go#L158
		loader: 'default',

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
		keepNames: true,

		...extendOptions,
	};

	if (options.sourcefile) {
		const { sourcefile } = options;
		const extension = path.extname(sourcefile);

		if (extension) {
			// https://github.com/evanw/esbuild/issues/1932
			if (extension === '.cts' || extension === '.mts') {
				options.sourcefile = `${sourcefile.slice(0, -3)}ts`;
			}
		} else {
			// esbuild errors to detect loader when a file doesn't have an extension
			options.sourcefile += '.js';
		}
	}

	return options;
};
