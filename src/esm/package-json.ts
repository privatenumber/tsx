import fs from 'fs';
import { fileURLToPath } from 'url';
import type { PackageJson } from 'type-fest';

const packageJsonCache = new Map<string, PackageJson | undefined>();
async function readPackageJson(filePath: string) {
	if (packageJsonCache.has(filePath)) {
		return packageJsonCache.get(filePath);
	}

	const exists = await fs.promises.access(filePath).then(
		() => true,
		() => false,
	);

	if (!exists) {
		packageJsonCache.set(filePath, undefined);
		return;
	}

	const packageJsonString = await fs.promises.readFile(filePath, 'utf8');
	try {
		const packageJson = JSON.parse(packageJsonString) as PackageJson;
		packageJsonCache.set(filePath, packageJson);
		return packageJson;
	} catch {
		throw new Error(`Error parsing: ${filePath}`);
	}
}

// From Node.js
// https://github.com/nodejs/node/blob/e86a6383054623e5168384a83d8cd6ebfe1fb584/lib/internal/modules/esm/resolve.js#L229
async function findPackageJson(
	filePath: string,
) {
	let packageJsonUrl = new URL('package.json', filePath);

	while (true) {
		// Don't look outside of /node_modules/
		if (packageJsonUrl.pathname.endsWith('/node_modules/package.json')) {
			break;
		}

		const packageJsonPath = fileURLToPath(packageJsonUrl);
		const packageJson = await readPackageJson(packageJsonPath);

		if (packageJson) {
			return packageJson;
		}

		const lastPackageJSONUrl = packageJsonUrl;
		packageJsonUrl = new URL('../package.json', packageJsonUrl);

		// Terminates at root where ../package.json equals ../../package.json
		// (can't just check "/package.json" for Windows support).
		if (packageJsonUrl.pathname === lastPackageJSONUrl.pathname) {
			break;
		}
	}
}

export async function getPackageType(
	filePath: string,
) {
	const packageJson = await findPackageJson(filePath);
	return packageJson?.type ?? 'commonjs';
}
