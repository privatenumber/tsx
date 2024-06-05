import fs from 'node:fs';
import Module from 'node:module';
import type { TransformOptions } from 'esbuild';
import { transformSync } from '../../utils/transform/index.js';
import { transformDynamicImport } from '../../utils/transform/transform-dynamic-import.js';
import { isESM } from '../../utils/esm-pattern.js';
import { shouldApplySourceMap, inlineSourceMap } from '../../source-map.js';
import { parent } from '../../utils/ipc/client.js';
import { fileMatcher } from '../../utils/tsconfig.js';

const typescriptExtensions = [
	'.cts',
	'.mts',
	'.ts',
	'.tsx',
	'.jsx',
] as const;

const transformExtensions = [
	'.js',
	'.cjs',
	'.mjs',
] as const;

// Clone Module._extensions with null prototype
export const extensions: NodeJS.RequireExtensions = Object.assign(
	Object.create(null),
	Module._extensions,
);

const defaultLoader = extensions['.js'];

const transformer = (
	module: Module,
	filePath: string,
) => {
	// Make sure __filename doesnt contain query
	const cleanFilePath = filePath.split('?')[0];

	// For tracking dependencies in watch mode
	if (parent?.send) {
		parent.send({
			type: 'dependency',
			path: cleanFilePath,
		});
	}

	const transformTs = typescriptExtensions.some(extension => cleanFilePath.endsWith(extension));
	const transformJs = transformExtensions.some(extension => cleanFilePath.endsWith(extension));
	if (!transformTs && !transformJs) {
		return defaultLoader(module, cleanFilePath);
	}

	let code = fs.readFileSync(cleanFilePath, 'utf8');

	if (cleanFilePath.endsWith('.cjs')) {
		// Contains native ESM check
		const transformed = transformDynamicImport(filePath, code);
		if (transformed) {
			code = (
				shouldApplySourceMap()
					? inlineSourceMap(transformed)
					: transformed.code
			);
		}
	} else if (
		transformTs

		// CommonJS file but uses ESM import/export
		|| isESM(code)
	) {
		const transformed = transformSync(
			code,
			filePath,
			{
				tsconfigRaw: fileMatcher?.(cleanFilePath) as TransformOptions['tsconfigRaw'],
			},
		);

		code = (
			shouldApplySourceMap()
				? inlineSourceMap(transformed)
				: transformed.code
		);
	}

	module._compile(code, cleanFilePath);
};

[
	/**
	 * Handles .cjs, .cts, .mts & any explicitly specified extension that doesn't match any loaders
	 *
	 * Any file requested with an explicit extension will be loaded using the .js loader:
	 * https://github.com/nodejs/node/blob/e339e9c5d71b72fd09e6abd38b10678e0c592ae7/lib/internal/modules/cjs/loader.js#L430
	 */
	'.js',

	/**
	 * Loaders for implicitly resolvable extensions
	 * https://github.com/nodejs/node/blob/v12.16.0/lib/internal/modules/cjs/loader.js#L1166
	 */
	'.ts',
	'.tsx',
	'.jsx',
].forEach((extension) => {
	extensions[extension] = transformer;
});

/**
 * Loaders for explicitly resolvable extensions
 * (basically just .mjs because CJS loader has a special handler for it)
 *
 * Loaders for extensions .cjs, .cts, & .mts don't need to be
 * registered because they're explicitly specified and unknown
 * extensions (incl .cjs) fallsback to using the '.js' loader:
 * https://github.com/nodejs/node/blob/v18.4.0/lib/internal/modules/cjs/loader.js#L430
 *
 * That said, it's actually ".js" and ".mjs" that get special treatment
 * rather than ".cjs" (it might as well be ".random-ext")
 */
Object.defineProperty(extensions, '.mjs', {
	value: transformer,

	// Prevent Object.keys from detecting these extensions
	// when CJS loader iterates over the possible extensions
	enumerable: false,
});
