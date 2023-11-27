import path from 'path';
import fs from 'fs';
import Module from 'module';
import {
	getTsconfig,
	parseTsconfig,
	createPathsMatcher,
	createFilesMatcher,
} from 'get-tsconfig';
import type { TransformOptions } from 'esbuild';
import { installSourceMapSupport } from '../source-map.js';
import { transformSync } from '../utils/transform/index.js';
import { transformDynamicImport } from '../utils/transform/transform-dynamic-import.js';
import { resolveTsPath } from '../utils/resolve-ts-path.js';
import { isESM } from '../utils/esm-pattern.js';
import { connectingToServer, type SendToParent } from '../utils/ipc/client.js';

const isRelativePathPattern = /^\.{1,2}\//;
const isTsFilePatten = /\.[cm]?tsx?$/;
const nodeModulesPath = `${path.sep}node_modules${path.sep}`;

const tsconfig = (
	process.env.TSX_TSCONFIG_PATH
		? {
			path: path.resolve(process.env.TSX_TSCONFIG_PATH),
			config: parseTsconfig(process.env.TSX_TSCONFIG_PATH),
		}
		: getTsconfig()
);

const fileMatcher = tsconfig && createFilesMatcher(tsconfig);
const tsconfigPathsMatcher = tsconfig && createPathsMatcher(tsconfig);

const applySourceMap = installSourceMapSupport();

const extensions = Module._extensions;
const defaultLoader = extensions['.js'];

const typescriptExtensions = [
	'.cts',
	'.mts',
	'.ts',
	'.tsx',
	'.jsx',
];

const transformExtensions = [
	'.js',
	'.cjs',
	'.mjs',
];

let sendToParent: SendToParent | void;
connectingToServer.then(
	(_sendToParent) => {
		sendToParent = _sendToParent;
	},
	() => {},
);

const transformer = (
	module: Module,
	filePath: string,
) => {
	// For tracking dependencies in watch mode
	if (sendToParent) {
		sendToParent({
			type: 'dependency',
			path: filePath,
		});
	}

	const transformTs = typescriptExtensions.some(extension => filePath.endsWith(extension));
	const transformJs = transformExtensions.some(extension => filePath.endsWith(extension));
	if (!transformTs && !transformJs) {
		return defaultLoader(module, filePath);
	}

	let code = fs.readFileSync(filePath, 'utf8');

	if (filePath.endsWith('.cjs')) {
		// Contains native ESM check
		const transformed = transformDynamicImport(filePath, code);
		if (transformed) {
			code = applySourceMap(transformed);
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
				tsconfigRaw: fileMatcher?.(filePath) as TransformOptions['tsconfigRaw'],
			},
		);

		code = applySourceMap(transformed);
	}

	module._compile(code, filePath);
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

const defaultResolveFilename = Module._resolveFilename.bind(Module);
Module._resolveFilename = (request, parent, isMain, options) => {
	// Strip query string
	const queryIndex = request.indexOf('?');
	if (queryIndex !== -1) {
		request = request.slice(0, queryIndex);
	}

	if (
		tsconfigPathsMatcher

		// bare specifier
		&& !isRelativePathPattern.test(request)

		// Dependency paths should not be resolved using tsconfig.json
		&& !parent?.filename?.includes(nodeModulesPath)
	) {
		const possiblePaths = tsconfigPathsMatcher(request);

		for (const possiblePath of possiblePaths) {
			const tsFilename = resolveTsFilename(possiblePath, parent, isMain, options);
			if (tsFilename) {
				return tsFilename;
			}

			try {
				return defaultResolveFilename(
					possiblePath,
					parent,
					isMain,
					options,
				);
			} catch {}
		}
	}

	const tsFilename = resolveTsFilename(request, parent, isMain, options);
	if (tsFilename) {
		return tsFilename;
	}

	return defaultResolveFilename(request, parent, isMain, options);
};

type NodeError = Error & {
	code: string;
};

/**
 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
 */
const resolveTsFilename = (
	request: string,
	parent: Module.Parent,
	isMain: boolean,
	options?: Record<PropertyKey, unknown>,
) => {
	const tsPath = resolveTsPath(request);

	if (
		parent?.filename
		&& isTsFilePatten.test(parent.filename)
		&& tsPath
	) {
		for (const tryTsPath of tsPath) {
			try {
				return defaultResolveFilename(
					tryTsPath,
					parent,
					isMain,
					options,
				);
			} catch (error) {
				const { code } = error as NodeError;
				if (
					code !== 'MODULE_NOT_FOUND'
					&& code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED'
				) {
					throw error;
				}
			}
		}
	}
};
