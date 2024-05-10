import path from 'node:path';
import type { ModuleFormat } from 'node:module';
import {
	getTsconfig,
	parseTsconfig,
	createPathsMatcher,
	createFilesMatcher,
} from 'get-tsconfig';
import { getPackageType } from './package-json.js';

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

export const fileProtocol = 'file://';

export const tsExtensionsPattern = /\.([cm]?ts|[tj]sx)($|\?)/;

export const isJsonPattern = /\.json(?:$|\?)/;

const getFormatFromExtension = (fileUrl: string): ModuleFormat | undefined => {
	const extension = path.extname(fileUrl.split('?')[0]);

	if (extension === '.json') {
		return 'json';
	}

	if (extension === '.mjs' || extension === '.mts') {
		return 'module';
	}

	if (extension === '.cjs' || extension === '.cts') {
		return 'commonjs';
	}
};

export const getFormatFromFileUrl = (fileUrl: string) => {
	const format = getFormatFromExtension(fileUrl);

	if (format) {
		return format;
	}

	// ts, tsx, jsx
	if (tsExtensionsPattern.test(fileUrl)) {
		return getPackageType(fileUrl);
	}
};

export type MaybePromise<T> = T | Promise<T>;

export const namespaceQuery = 'tsx-namespace=';
export const getNamespace = (
	url: string,
) => {
	const index = url.indexOf(namespaceQuery);
	if (index === -1) {
		return;
	}

	const charBefore = url[index - 1];
	if (charBefore !== '?' && charBefore !== '&') {
		return;
	}

	const startIndex = index + namespaceQuery.length;
	const endIndex = url.indexOf('&', startIndex);

	return (
		endIndex === -1
			? url.slice(startIndex)
			: url.slice(startIndex, endIndex)
	);
};
