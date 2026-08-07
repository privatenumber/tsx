import fs from 'node:fs';
import path from 'node:path';
import Module from 'node:module';
import { pathToFileURL } from 'node:url';
import type { TransformOptions } from 'esbuild';
import { isFileIncluded, type TsconfigResult } from 'get-tsconfig';
import { transformSync } from '../../utils/transform/index.js';
import { transformDynamicImport } from '../../utils/transform/transform-dynamic-import.js';
import { isESM } from '../../utils/es-module-lexer.js';
import { shouldApplySourceMap, inlineSourceMap } from '../../source-map.js';
import { parent } from '../../utils/ipc/client.js';
import { logCjs as log } from '../../utils/debug.js';
import { isFeatureSupported, requireEsm } from '../../utils/node-features.js';
import { getNearestPackageTypeSync } from '../../esm/hook/package-json.js';
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

const moduleExportsInteropExport = 'module.exports';
const esbuildTopLevelAwaitCjsError = 'Top-level await is currently not supported with the "cjs" output format';

// tsx may still transform ESM syntax in explicit CommonJS scopes, but native
// require(esm) only applies to these module-system candidates.
// https://github.com/nodejs/node/blob/v24.15.0/doc/api/modules.md#L206-L214
const isRequireEsmCandidate = (
	filePath: string,
) => {
	const extension = path.extname(filePath);
	return (
		extension === '.mjs'
		|| extension === '.mts'
		|| (
			(
				extension === '.js'
				|| extension === '.ts'
			)
			&& getNearestPackageTypeSync(pathToFileURL(filePath).toString()) !== 'commonjs'
		)
	);
};

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
	tsconfig: TsconfigResult | undefined,
	namespace?: string,
) => {
	const defaultLoader = extensions['.js'];

	// Native require(esm) honors the explicit 'module.exports' export.
	// https://github.com/nodejs/node/pull/55085
	// https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1704-L1706
	// Node exposes whether require(esm) is enabled through this runtime feature.
	// https://github.com/nodejs/node/blob/v24.15.0/doc/api/process.md#L2005-L2017
	const shouldApplyRequireEsmInterop = (
		process.features.require_module
		?? isFeatureSupported(requireEsm)
	);

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

		log(2, 'load', {
			filePath,
		});

		/**
		 * In new Module(), m.path = path.dirname(module.id) but module.id coming from
		 * ESM resolver may be a data: path
		 *
		 * In these cases, we fix m.path to be the actual directory of the file
		 */
		// https://github.com/nodejs/node/blob/v22.8.0/lib/internal/modules/cjs/loader.js#L298
		if (module.id?.startsWith('data:text/javascript,')) {
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
		const isEsmSyntax = (
			transformJs
			&& !cleanFilePath.endsWith('.cjs')
			&& !cleanFilePath.endsWith('.cts')
			&& isESM(code)
		);
		const tsconfigRaw = (
			(transformTs || isEsmSyntax)
			&& tsconfig
			&& isFileIncluded(tsconfig, cleanFilePath)
				? tsconfig.config as TransformOptions['tsconfigRaw']
				: undefined
		);

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
			|| isEsmSyntax
		) {
			try {
				const transformed = transformSync(
					code,
					filePath,
					{
						tsconfigRaw,
					},
				);

				code = (
					shouldApplySourceMap()
						? inlineSourceMap(transformed)
						: transformed.code
				);
			} catch (error) {
				if (
					isRequireEsmCandidate(cleanFilePath)
					&& error instanceof Error
					&& error.name === 'TransformError'
					&& error.message.includes(esbuildTopLevelAwaitCjsError)
				) {
					// Preserve esbuild's diagnostic, but expose Node's loader code for import() fallback.
					// https://github.com/nodejs/node/blob/v18.20.8/lib/internal/modules/cjs/loader.js#L1387-L1396
					// https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/module_job.js#L396-L405
					Object.assign(error, {
						code: shouldApplyRequireEsmInterop
							? 'ERR_REQUIRE_ASYNC_MODULE'
							: 'ERR_REQUIRE_ESM',
					});
				}

				throw error;
			}
		}

		log(1, 'loaded', {
			filePath: cleanFilePath,
		});

		module._compile(code, cleanFilePath);
		if (query && Module._cache[cleanFilePath] === module) {
			Module._cache[filePath] = module;
			delete Module._cache[cleanFilePath];
		}

		const { exports } = module;
		const moduleExportsDescriptor = (
			shouldApplyRequireEsmInterop
			&& exports
			&& (
				typeof exports === 'object'
				|| typeof exports === 'function'
			)
				? Object.getOwnPropertyDescriptor(exports, moduleExportsInteropExport)
				: undefined
		);
		if (
			// esbuild emits transformed ESM exports as accessors; CJS object
			// literal properties are data descriptors and should not be unwrapped.
			moduleExportsDescriptor?.get
			&& isRequireEsmCandidate(cleanFilePath)
		) {
			module.exports = exports[moduleExportsInteropExport];
		}
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
			 * Registration needs to be enumerable for some 3rd party libraries
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
