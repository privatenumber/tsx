import path from 'node:path';
import type { TransformOptions, TransformResult } from 'esbuild';
import type { SourceMap } from '@ampproject/remapping';

export const baseConfig = Object.freeze({
	target: `node${process.versions.node}`,

	// "default" tells esbuild to infer loader from file name
	// https://github.com/evanw/esbuild/blob/4a07b17adad23e40cbca7d2f8931e8fb81b47c33/internal/bundler/bundler.go#L158
	loader: 'default',
});

// match Node.js debugger flags
// https://nodejs.org/api/cli.html#--inspecthostport
const NODE_DEBUGGER_FLAG_REGEX = /^--inspect(?:-brk|-port|-publish-uid|-wait)?(?:=|$)/;

const isNodeDebuggerEnabled = process.execArgv.some(flag => NODE_DEBUGGER_FLAG_REGEX.test(flag));

export const cacheConfig = {
	...baseConfig,

	sourcemap: true,

	/**
	 * Improve performance by only generating sourcesContent
	 * when V8 coverage is enabled or Node.js debugger is enabled
	 *
	 * https://esbuild.github.io/api/#sources-content
	 */
	sourcesContent: Boolean(process.env.NODE_V8_COVERAGE) || isNodeDebuggerEnabled,

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
		const extension = path.extname(originalSourcefile.split('?')[0]);

		if (extension) {
			// https://github.com/evanw/esbuild/issues/1932
			if (extension === '.cts' || extension === '.mts') {
				options.sourcefile = `${originalSourcefile.slice(0, -3)}ts`;
			} else if (extension === '.mjs') { // only used by CJS loader
				options.sourcefile = `${originalSourcefile.slice(0, -3)}js`;
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
