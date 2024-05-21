import path from 'node:path';
import {
	getTsconfig,
	parseTsconfig,
	createFilesMatcher,
	createPathsMatcher,
} from 'get-tsconfig';

const tsconfig = (
	process.env.TSX_TSCONFIG_PATH
		? {
			path: path.resolve(process.env.TSX_TSCONFIG_PATH),
			config: parseTsconfig(process.env.TSX_TSCONFIG_PATH),
		}
		: getTsconfig()
);

export const fileMatcher = tsconfig && createFilesMatcher(tsconfig);

export const tsconfigPathsMatcher = tsconfig && createPathsMatcher(tsconfig);

export const allowJs = tsconfig?.config.compilerOptions?.allowJs ?? false;
