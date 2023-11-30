export type Version = [number, number, number];

// Is v1 greater or equal to v2?
const isVersionGreaterOrEqual = (v1: Version, v2: Version): boolean => {
	const majorDiff = v1[0] - v2[0];
	if (majorDiff === 0) {
		const minorDiff = v1[1] - v2[1];
		if (minorDiff === 0) {
			return v1[2] >= v2[2];
		}
		return minorDiff > 0;
	}
	return majorDiff > 0;
};

const currentNodeVersion = process.versions.node.split('.').map(Number) as Version;

export const isFeatureSupported = (
	versions: Version[],
	current = currentNodeVersion,
) => {
	for (let i = 0; i < versions.length; i += 1) {
		const version = versions[i];

		// If last version, check if greater
		if (i === versions.length - 1) {
			return isVersionGreaterOrEqual(current, version);
		}

		// Otherwise, check within major range
		if (current[0] === version[0]) {
			return isVersionGreaterOrEqual(current, version);
		}
	}

	return false;
};

// https://nodejs.org/docs/latest/api/module.html#moduleregisterspecifier-parenturl-options
export const moduleRegister: Version[] = [
	[18, 19, 0],
	[20, 6, 0],
];

// https://nodejs.org/docs/latest/api/esm.html#import-attributes
export const importAttributes: Version[] = [
	[18, 19, 0],
	[20, 10, 0],
	[21, 0, 0],
];

// https://github.com/nodejs/node/releases/tag/v21.0.0
export const testRunnerGlob: Version[] = [
	[21, 0, 0],
];
