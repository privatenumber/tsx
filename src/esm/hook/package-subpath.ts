import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { PackageJson } from 'type-fest';
import { readJsonFile } from '../../utils/read-json-file.js';
import { fileUrlPrefix, isFilePath, nodeModulesPath } from '../../utils/path-utils.js';

export type PackageSubpathDirectoryInfo =
| { kind: 'root-exports' }
| {
	kind: 'legacy-directory';
	mainUrl?: string;
};

const isBarePackageSubpath = (
	specifier: string,
) => {
	if (
		isFilePath(specifier)
		|| specifier.startsWith('#')
		|| specifier.includes(':')
	) {
		return false;
	}

	const segments = specifier.split('/');
	const packageNameSegmentLength = segments[0]?.startsWith('@') ? 2 : 1;
	return (
		segments.length > packageNameSegmentLength
		&& segments.slice(0, packageNameSegmentLength).every(Boolean)
	);
};

const getPackageDirectory = (
	directoryPath: string,
) => {
	const nodeModulesIndex = directoryPath.lastIndexOf(nodeModulesPath);
	if (nodeModulesIndex === -1) {
		return;
	}

	const packagePath = directoryPath.slice(nodeModulesIndex + nodeModulesPath.length);
	const packagePathSegments = packagePath.split(path.sep);
	const packageNameSegmentLength = packagePathSegments[0]?.startsWith('@') ? 2 : 1;
	if (
		packagePathSegments.length <= packageNameSegmentLength
		|| !packagePathSegments[packageNameSegmentLength - 1]
	) {
		return;
	}

	return path.join(
		directoryPath.slice(0, nodeModulesIndex),
		'node_modules',
		...packagePathSegments.slice(0, packageNameSegmentLength),
	);
};

export const getPackageSubpathDirectoryInfo = (
	specifier: string,
	directoryUrl: string,
): PackageSubpathDirectoryInfo | undefined => {
	if (
		!isBarePackageSubpath(specifier)
		|| !directoryUrl.startsWith(fileUrlPrefix)
	) {
		return;
	}

	const directoryPath = fileURLToPath(directoryUrl);
	const packageDirectory = getPackageDirectory(directoryPath);
	if (!packageDirectory) {
		return;
	}

	const rootPackageJson = readJsonFile<PackageJson>(path.join(packageDirectory, 'package.json'));
	const rootPackageExports = rootPackageJson?.exports;
	if (rootPackageExports !== undefined && rootPackageExports !== null) {
		return { kind: 'root-exports' };
	}

	const packageJson = readJsonFile<PackageJson>(path.join(directoryPath, 'package.json'));
	if (typeof packageJson?.main !== 'string' || !packageJson.main) {
		return { kind: 'legacy-directory' };
	}

	return {
		kind: 'legacy-directory',
		mainUrl: pathToFileURL(path.resolve(directoryPath, packageJson.main)).toString(),
	};
};
