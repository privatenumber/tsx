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
	const splitPath = filePath.split('?');
	let [pathname] = splitPath;
	const extension = path.extname(pathname);

	let tryExtensions = tsExtensions[extension];
	if (tryExtensions) {
		pathname = pathname.slice(0, -extension.length);
	} else {
		if (!handleMissingExtension) {
			return;
		}

		tryExtensions = noExtension;
	}

	return tryExtensions.map(
		tsExtension => (
			pathname
			+ tsExtension
			+ (splitPath[1] ? `?${splitPath[1]}` : '')
		),
	);
};
