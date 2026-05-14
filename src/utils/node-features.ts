export type Version = [number, number, number];
export type VersionRange = {
	from: Version;
	before?: Version;
};

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

const isVersionLessThan = (v1: Version, v2: Version) => !isVersionGreaterOrEqual(v1, v2);

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

export const isFeatureSupportedInRange = (
	ranges: VersionRange[],
	current = currentNodeVersion,
) => (
	ranges.some(({ from, before }) => (
		isVersionGreaterOrEqual(current, from)
		&& (
			before === undefined
			|| isVersionLessThan(current, before)
		)
	))
);

// https://nodejs.org/docs/latest/api/module.html#moduleregisterspecifier-parenturl-options
export const moduleRegister: Version[] = [
	[18, 19, 0],
	[20, 6, 0],
];

// Node can re-enter Module._load from sync ESM hooks for CommonJS only after
// this flag was added to the sync load/translate path.
// https://github.com/nodejs/node/pull/59929
// https://github.com/nodejs/node/blob/v24.11.1/lib/internal/modules/esm/load.js#L144-L171
// https://github.com/nodejs/node/blob/v24.11.1/lib/internal/modules/esm/translators.js#L345-L356
export const moduleRegisterHooksCjsReload: Version[] = [
	[24, 11, 1],
	[25, 1, 0],
	[26, 0, 0],
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

// https://github.com/nodejs/node/pull/48740
// https://github.com/nodejs/node/blob/v20.11.0/doc/api/esm.md#L328-L362
export const importMetaPathProperties: Version[] = [
	[20, 11, 0],
	[21, 2, 0],
];

// https://github.com/nodejs/node/pull/55085
export const requireEsm: Version[] = [
	[20, 19, 0],
	[22, 12, 0],
	[23, 0, 0],
];

// Node v23 exposes CJS module.exports on the synthetic ESM namespace.
// https://github.com/nodejs/node/pull/57366
// https://github.com/nodejs/node/blob/v23.0.0/lib/internal/modules/esm/translators.js#L187-L224
export const cjsNamespaceModuleExports: Version[] = [
	[23, 0, 0],
];

// https://github.com/nodejs/node/pull/56350
export const nativeTypeScript: Version[] = [
	[22, 18, 0],
	[23, 6, 0],
	[24, 0, 0],
];

// https://github.com/nodejs/node/pull/57038
export const wasmModules: Version[] = [
	[22, 19, 0],
	[24, 5, 0],
];

// https://github.com/nodejs/node/pull/50825
// https://github.com/nodejs/node/pull/54769
export const cjsNamespaceFromLoadHook: VersionRange[] = [
	{
		from: [20, 11, 0],
		before: [21, 0, 0],
	},
	{
		from: [21, 3, 0],
		before: [22, 0, 0],
	},
	{
		from: [22, 0, 0],
		before: [22, 10, 0],
	},
];

// https://github.com/nodejs/node/pull/55085
// https://github.com/nodejs/node/pull/55590
export const requireEsmExtensionlessMjs: VersionRange[] = [
	{
		from: [20, 19, 0],
		before: [20, 19, 5],
	},
	{
		from: [22, 12, 0],
		before: [22, 14, 0],
	},
];

// https://github.com/nodejs/node/pull/55708
export const modulePackageMainResolution: Version[] = [
	[18, 20, 5],
	[19, 0, 0],
];
