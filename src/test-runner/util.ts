// based on the specification found here:
// https://nodejs.org/api/test.html#test-runner-execution-model
import fs from 'fs';
import path from 'path';

const fileExtensions = [
	'.js',
	'.cjs',
	'.mjs',
	'.ts',
	'.cts',
	'.mts',
];

const testFileSuffices = fileExtensions.map(extension => `test${extension}`);

// Refrain from usage of regexp due to performance
const isTestFile = (filename: string): boolean => {
	if (!filename.includes('test')) {
		return false;
	}

	for (const testFileSuffix of testFileSuffices) {
		if (filename === testFileSuffix) {
			return true;
		}

		for (const preceedSuffix of ['.', '-', '_']) {
			if (filename.endsWith(preceedSuffix + testFileSuffix)) {
				return true;
			}
		}
	}

	return false;
};

const findInTestDirectory = (cwd: string): string[] => scanDirectory(
	cwd,
	relativePath => fileExtensions.some(extension => relativePath.endsWith(extension)),
	(relativePath, absolutePath) => findInTestDirectory(absolutePath),
);

const scanDirectory = (
	cwd: string,
	onFile: (relativePath: string, absolutePath: string) => boolean,
	onDirectory: (relativePath: string, absolutePath: string) => string[],
): string[] => {
	const directoryContents = fs.readdirSync(cwd);

	return directoryContents.flatMap((relativePath) => {
		const absolutePath = path.join(cwd, relativePath);
		const contentStat = fs.statSync(absolutePath);

		if (contentStat.isFile() && onFile(relativePath, absolutePath)) {
			return [absolutePath];
		}

		// always skip node_modules
		if (contentStat.isDirectory() && relativePath !== 'node_modules') {
			return onDirectory(relativePath, absolutePath);
		}

		return [];
	});
};

export const findTestFiles = (cwd = process.cwd()): string[] => scanDirectory(
	cwd,
	relativePath => isTestFile(relativePath),
	(relativePath, absolutePath) => {
		if (relativePath === 'test') {
			return findInTestDirectory(absolutePath);
		}
		return findTestFiles(absolutePath);
	},
);
