import path from 'path';
import {
	getTsconfig,
	parseTsconfig,
} from 'get-tsconfig';

export const isTsFilePatten = /\.[cm]?tsx?$/;

export const tsconfig = (
	process.env.TSX_TSCONFIG_PATH
		? {
			path: path.resolve(process.env.TSX_TSCONFIG_PATH),
			config: parseTsconfig(process.env.TSX_TSCONFIG_PATH),
		}
		: getTsconfig()
);
