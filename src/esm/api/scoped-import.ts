import { pathToFileURL } from 'node:url';

const resolveSpecifier = (
	specifier: string,
	fromFile: string,
	namespace: string,
) => {
	const base = (
		fromFile.startsWith('file://')
			? fromFile
			: pathToFileURL(fromFile)
	);
	const resolvedUrl = new URL(specifier, base);

	/**
	 * A namespace query is added so we get our own module cache
	 *
	 * I considered using an import attribute for this, but it doesn't seem to
	 * make the request unique so it gets cached.
	 */
	resolvedUrl.searchParams.set('tsx-namespace', namespace);

	return resolvedUrl.toString();
};

export type ScopedImport = (
	specifier: string,
	parentURL: string,
) => Promise<any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export const createScopedImport = (
	namespace: string,
): ScopedImport => (
	specifier,
	parentURL,
) => {
	if (!parentURL) {
		throw new Error('The current file path (import.meta.url) must be provided in the second argument of tsImport()');
	}

	return import(
		resolveSpecifier(specifier, parentURL, namespace)
	);
};
