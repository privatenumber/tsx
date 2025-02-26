import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import type { TransformOptions } from 'esbuild';
import backend from '../../backend/index.js';
import { transformDynamicImport } from '../../utils/transform/transform-dynamic-import.js';
import { isESM } from '../../utils/es-module-lexer.js';
import { shouldApplySourceMap, inlineSourceMap } from '../../source-map.js';
import { parent } from '../../utils/ipc/client.js';
import { fileMatcher } from '../../utils/tsconfig.js';
import type { LoaderState } from './types.js';

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

const implicitlyResolvableExtensions = [
	'.ts',
	'.tsx',
	'.jsx',
] as const;

const safeSet = <T extends Record<string, unknown>>(
	object: T,
	property: keyof T,
	value: T[keyof T],
	descriptor?: {
		enumerable?: boolean;
		configurable?: boolean;
		writable?: boolean;
	},
) => {
	const existingDescriptor = Object.getOwnPropertyDescriptor(object, property);

	// If setter is provided, use it
	if (existingDescriptor?.set) {
		object[property] = value;
	} else if (
		!existingDescriptor
		|| existingDescriptor.configurable
	) {
		Object.defineProperty(object, property, {
			value,
			enumerable: existingDescriptor?.enumerable || descriptor?.enumerable,
			writable: (
				descriptor?.writable
				?? (
					existingDescriptor
						? existingDescriptor.writable
						: true
				)
			),
			configurable: (
				descriptor?.configurable
				?? (
					existingDescriptor
						? existingDescriptor.configurable
						: true
				)
			),
		});
	}
};

export const createExtensions = (
	state: LoaderState,
	extensions: NodeJS.RequireExtensions,
	namespace?: string,
) => {
	const defaultLoader = extensions['.js'];

	const transformer = (
		module: Module,
		filePath: string,
	) => {
		if (state.enabled === false) {
			return defaultLoader(module, filePath);
		}

		// Make sure __filename doesnt contain query
		const [cleanFilePath, query] = filePath.split('?');

		const searchParams = new URLSearchParams(query);

		// If request namespace doesnt match the namespace, ignore
		if ((searchParams.get('namespace') ?? undefined) !== namespace) {
			return defaultLoader(module, filePath);
		}

		/**
		 * In new Module(), m.path = path.dirname(module.id) but module.id coming from
		 * ESM resolver may be a data: path
		 *
		 * In these cases, we fix m.path to be the actual directory of the file
		 */
		// https://github.com/nodejs/node/blob/v22.8.0/lib/internal/modules/cjs/loader.js#L298
		if (module.id.startsWith('data:text/javascript,')) {
			module.path = path.dirname(cleanFilePath);
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
			const transformed = backend.transformSync(
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
	safeSet(extensions, '.js', transformer);

	for (const extension of implicitlyResolvableExtensions) {
		safeSet(extensions, extension, transformer, {
			/**
			 * Registeration needs to be enumerable for some 3rd party libraries
			 * https://github.com/gulpjs/rechoir/blob/v0.8.0/index.js#L21 (used by Webpack CLI)
			 *
			 * If the extension already exists, inherit its enumerable property
			 * If not, only expose if it's not namespaced
			 */
			enumerable: !namespace,
			writable: true,
			configurable: true,
		});
	}

	/**
	 * Loaders for extensions .cjs, .cts, & .mts don't need to be
	 * registered because they're explicitly specified. And unknown
	 * extensions (incl .cjs) fallsback to using the '.js' loader:
	 * https://github.com/nodejs/node/blob/v18.4.0/lib/internal/modules/cjs/loader.js#L430
	 *
	 * That said, it's actually ".js" and ".mjs" that get special treatment
	 * rather than ".cjs" (it might as well be ".random-ext")
	 */
	safeSet(extensions, '.mjs', transformer, {
		/**
		 * enumerable defaults to whatever is already set, but if not set, it's false
		 *
		 * This prevent Object.keys from detecting these extensions
		 * when CJS loader iterates over the possible extensions
		 * https://github.com/nodejs/node/blob/v22.2.0/lib/internal/modules/cjs/loader.js#L609
		 */
		writable: true,
		configurable: true,
	});

	// Unregister
	return () => {
		/**
		 * The extensions are only reverted if they're still tsx's transformers
		 *
		 * Otherwise, it means they have been wrapped by another loader and should
		 * be left untouched not to remove the other loader
		 */
		if (extensions['.js'] === transformer) {
			extensions['.js'] = defaultLoader;
		}

		for (const extension of [...implicitlyResolvableExtensions, '.mjs']) {
			if (extensions[extension] === transformer) {
				delete extensions[extension];
			}
		}
	};
};
