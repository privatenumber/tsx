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

// https://github.com/nodejs/node/pull/50825
export const esmLoadReadFile: Version[] = [
	[20, 11, 0],
	[21, 3, 0],
];

// require(esm) extension/index fallback — `require('./mjs/index')` resolving to
// `./mjs/index.mjs` and `require('./mjs/')` resolving to `./mjs/index.mjs`.
// Confirmed working on Node 20.19+. Observed broken on Node 22.22 and 25.9.
// https://github.com/nodejs/node/pull/55085
export const isRequireEsmSupported = (current: Version): boolean => {
	const [major, minor] = current;
	return major === 20 && minor >= 19;
};

// https://github.com/nodejs/node/pull/55229 — `module.exports` namespace key on CJS imports.
// Verified absent on Node 22.22, present on 23.0.0, 23.11.1, 24.15.0, 25.9.0.
export const cjsModuleExportsKey: Version[] = [
	[23, 0, 0],
];

// cjs-module-lexer namespace lift (named exports surface at the top of `import * as ns`).
// Present in 20.11+/21.3+/22.0+, but observed disabled by 22.22 (CI Node 22.6 passes; 22.22 fails).
// Best guess threshold is 22.7.0 (when --experimental-detect-module became default).
export const isCjsLiftSupported = (current: Version): boolean => {
	const [major, minor] = current;
	if (major < 20) return false;
	if (major === 20) return minor >= 11;
	if (major === 21) return minor >= 3;
	if (major === 22) return minor < 7;
	return false;
};

// https://github.com/nodejs/node/pull/55241 — --experimental-wasm-modules unflagged
export const wasmModules: Version[] = [
	[22, 12, 0],
	[23, 0, 0],
];
