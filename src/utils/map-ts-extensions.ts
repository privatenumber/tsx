import path from 'node:path';

const noExtension = ['.js', '.json', '.ts', '.tsx', '.jsx'];

const tsExtensions: Record<string, string[]> = Object.create(null);
tsExtensions['.js'] = ['.ts', '.tsx', '.js', '.jsx'];
tsExtensions['.jsx'] = ['.tsx', '.ts', '.jsx', '.js'];
tsExtensions['.cjs'] = ['.cts'];
tsExtensions['.mjs'] = ['.mts'];

export const mapTsExtensions = (
	filePath: string,
	handleMissingExtension?: boolean,
) => {
	const [pathname, search] = filePath.split('?');
	const extension = path.extname(pathname);
	const tryExtensions = (
		extension
			? tsExtensions[extension]
			: (handleMissingExtension ? noExtension : undefined)
	);

	if (!tryExtensions) {
		return;
	}

	const extensionlessPath = (
		extension
			? pathname.slice(0, -extension.length)
			: pathname
	);

	return tryExtensions.map(
		tsExtension => (
			extensionlessPath
			+ tsExtension
			+ (search ? `?${search}` : '')
		),
	);
};
