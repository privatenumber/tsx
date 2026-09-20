import path from 'node:path';
import { parseEsm } from '../../utils/es-module-lexer.js';
import { tsExtensions } from '../../utils/path-utils.js';
import { getPackageType, getPackageTypeSync } from './package-json.js';

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

export const getFormatFromFileUrlSync = (fileUrl: string) => {
	const { pathname } = new URL(fileUrl);
	const extension = path.extname(pathname);
	if (extension === '.mts' || extension === '.mjs') {
		return 'module';
	}
	if (extension === '.cts' || extension === '.cjs') {
		return 'commonjs';
	}

	if (extension === '.js' || tsExtensions.includes(extension)) {
		return getPackageTypeSync(fileUrl);
	}
};

export const namespaceSearchParameter = 'tsx-namespace';
export const namespaceQuery = `${namespaceSearchParameter}=`;
export const commonJsExportPreparseSearchParameter = 'tsx-commonjs-export-preparse';
export const commonJsExportPreparseQuery = `${commonJsExportPreparseSearchParameter}=1`;
export const commonJsVirtualQuerySearchParameter = 'tsx-commonjs-virtual-query';
export const moduleSourceByUrl = new Map<string, string>();

const dataUrlPattern = /^data:/i;

export const isDataUrl = (
	url: string,
) => dataUrlPattern.test(url);

type CommonJsImportBinding = 'named' | 'namespace' | undefined;

export const getQueryWithoutParameters = (
	search: string,
	parameters: string[],
) => (
	search
		.slice(1)
		.split('&')
		.filter(parameter => (
			parameter
			&& parameters.every(parameterPrefix => !parameter.startsWith(parameterPrefix))
		))
		.join('&')
);

export const getSearchWithoutParameters = (
	search: string,
	parameters: string[],
) => {
	const query = getQueryWithoutParameters(search, parameters);
	return query ? `?${query}` : '';
};

const stripComments = (
	source: string,
) => source.replaceAll(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '');

const getCommonJsImportBinding = (
	statementBeforeSpecifier: string,
): CommonJsImportBinding => {
	const statement = stripComments(statementBeforeSpecifier);

	if (/^\s*export\s*\*/.test(statement)) {
		return 'named';
	}

	if (/^\s*import\s*\*\s*as\s+[\w$]+/.test(statement)) {
		return 'namespace';
	}

	const namedBindings = statement.match(/\{([^}]*)\}/)?.[1];
	if (!namedBindings) {
		return;
	}

	return (
		namedBindings
			.split(',')
			.some((binding) => {
				const importedName = binding.trim().split(/\s+as\s+/)[0];
				return Boolean(importedName && importedName !== 'default');
			})
			? 'named'
			: undefined
	);
};

export const parentImportsCommonJsExports = (
	parentUrl: string,
	specifier: string,
	includeNamespaceImports: boolean,
) => {
	const source = moduleSourceByUrl.get(parentUrl);
	if (!source) {
		return false;
	}

	try {
		const [imports] = parseEsm(source);
		return imports.some((importSpecifier) => {
			if (
				importSpecifier.d !== -1
				|| importSpecifier.n !== specifier
			) {
				return false;
			}

			const binding = getCommonJsImportBinding(source.slice(importSpecifier.ss, importSpecifier.s));
			return (
				binding === 'named'
				|| (
					includeNamespaceImports
					&& binding === 'namespace'
				)
			);
		});
	} catch {
		return false;
	}
};

export const getNamespace = (
	url: string,
) => {
	const queryIndex = url.indexOf('?');
	const fragmentIndex = url.indexOf('#');
	if (isDataUrl(url)) {
		if (fragmentIndex === -1) {
			return;
		}

		// Data URL fragments are user content; tsx appends its marker last.
		const fragment = url.slice(fragmentIndex + 1);
		const parameterIndex = fragment.lastIndexOf('&');
		const parameter = fragment.slice(parameterIndex + 1);
		return parameter.startsWith(namespaceQuery)
			? parameter.slice(namespaceQuery.length)
			: undefined;
	}

	if (
		queryIndex === -1
		|| (fragmentIndex !== -1 && fragmentIndex < queryIndex)
	) {
		return;
	}

	return new URLSearchParams(
		url.slice(queryIndex, fragmentIndex === -1 ? undefined : fragmentIndex),
	).get(namespaceSearchParameter) ?? undefined;
};
