import path from 'node:path';
import type { ModuleFormat } from 'node:module';
import { tsExtensions } from '../../utils/path-utils.js';
import { getPackageType } from './package-json.js';

export const getFormatFromFileUrl = (fileUrl: string) => {
	const { pathname } = new URL(fileUrl);
	const extension = path.extname(pathname);
	if (extension === '.mts' || extension === '.mjs') {
		return 'module';
	}
	if (extension === '.cts' || extension === '.cjs') {
		return 'commonjs';
	}

	if (extension === '.js' || tsExtensions.includes(extension)) {
		return getPackageType(fileUrl);
	}
};

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
