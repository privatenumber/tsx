import path from 'path';
import {
	getTsconfig,
	parseTsconfig,
	createPathsMatcher,
	createFilesMatcher,
} from 'get-tsconfig';

export const isRelativePathPattern = /^\.{1,2}\//;
export const isTsFilePatten = /\.[cm]?tsx?$/;
export const nodeModulesPath = `${path.sep}node_modules${path.sep}`;


export const typescriptExtensions = [
	'.cts',
	'.mts',
	'.ts',
	'.tsx',
	'.jsx',
];

export const transformExtensions = [
	'.js',
	'.cjs',
	'.mjs',
];

export const tsconfig = (
	process.env.TSX_TSCONFIG_PATH
		? {
			path: path.resolve(process.env.TSX_TSCONFIG_PATH),
			config: parseTsconfig(process.env.TSX_TSCONFIG_PATH),
		}
		: getTsconfig()
);
