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

export const createExtensions = (
	extendExtensions: NodeJS.RequireExtensions,
	namespace?: string,
) => {
	// Clone Module._extensions with null prototype
	const extensions: NodeJS.RequireExtensions = Object.assign(
		Object.create(null),
		extendExtensions,
	);

	const defaultLoader = extensions['.js'];

	const transformer = (
		module: Module,
		filePath: string,
	) => {
		// Make sure __filename doesnt contain query
		const [cleanFilePath, query] = filePath.split('?');

		const searchParams = new URLSearchParams(query);

		// If request namespace  doesnt match the namespace, ignore
		if ((searchParams.get('namespace') ?? undefined) !== namespace) {
			return defaultLoader(module, cleanFilePath);
		}

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

	/**
	 * Handles .cjs, .cts, .mts & any explicitly specified extension that doesn't match any loaders
	 *
	 * Any file requested with an explicit extension will be loaded using the .js loader:
	 * https://github.com/nodejs/node/blob/e339e9c5d71b72fd09e6abd38b10678e0c592ae7/lib/internal/modules/cjs/loader.js#L430
	 */
	extensions['.js'] = transformer;

	[
		'.ts',
		'.tsx',
		'.jsx',

		/**
		 * Loaders for extensions .cjs, .cts, & .mts don't need to be
		 * registered because they're explicitly specified. And unknown
		 * extensions (incl .cjs) fallsback to using the '.js' loader:
		 * https://github.com/nodejs/node/blob/v18.4.0/lib/internal/modules/cjs/loader.js#L430
		 *
		 * That said, it's actually ".js" and ".mjs" that get special treatment
		 * rather than ".cjs" (it might as well be ".random-ext")
		 */
		'.mjs',
	].forEach((extension) => {
		Object.defineProperty(extensions, extension, {
			value: transformer,

			/**
			 * Prevent Object.keys from detecting these extensions
			 * when CJS loader iterates over the possible extensions
			 * https://github.com/nodejs/node/blob/v22.2.0/lib/internal/modules/cjs/loader.js#L609
			 */
			enumerable: false,
		});
	});

	return extensions;
};
