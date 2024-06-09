import path from 'node:path';

const tsExtensions: Record<string, string[]> = Object.create(null);
tsExtensions['.js'] = ['.ts', '.tsx', '.js', '.jsx'];
tsExtensions['.jsx'] = ['.tsx', '.ts', '.jsx', '.js'];
tsExtensions['.cjs'] = ['.cts'];
tsExtensions['.mjs'] = ['.mts'];

export const mapTsExtensions = (
	filePath: string,
) => {
	const [pathname, search] = filePath.split('?');
	const extension = path.extname(pathname);
	const possibleExtensions = tsExtensions[extension];
	if (!possibleExtensions) {
		return;
	}

	const extensionlessPath = pathname.slice(0, -extension.length);
	return possibleExtensions.map(
		tsExtension => (
			extensionlessPath
			+ tsExtension
			+ (search ? `?${search}` : '')
		),
	);
};
