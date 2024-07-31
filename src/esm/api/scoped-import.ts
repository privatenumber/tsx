import { pathToFileURL } from 'node:url';
import type { TsxRequest } from '../types.js';
import { fileUrlPrefix } from '../../utils/path-utils.js';

export type ScopedImport = (
	specifier: string,
	parent: string,
) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const createScopedImport = (
	namespace: string,
): ScopedImport => (
	specifier,
	parent,
) => {
	if (!parent) {
		throw new Error('The current file path (import.meta.url) must be provided in the second argument of tsImport()');
	}

	const parentURL = (
		parent.startsWith(fileUrlPrefix)
			? parent
			: pathToFileURL(parent).toString()
	);

	return import(
		`tsx://${JSON.stringify({
			specifier,
			parentURL,
			namespace,
		} satisfies TsxRequest)}`
	);
};
