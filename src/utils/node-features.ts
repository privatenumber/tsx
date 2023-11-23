type Version = [number, number, number];

const nodeVersion = process.versions.node.split('.').map(Number) as Version;

const compareNodeVersion = (version: Version) => (
	nodeVersion[0] - version[0]
	|| nodeVersion[1] - version[1]
	|| nodeVersion[2] - version[2]
);

/**
 * Node.js loaders are isolated from v20
 * https://github.com/nodejs/node/issues/49455#issuecomment-1703812193
 * https://github.com/nodejs/node/blob/33710e7e7d39d19449a75911537d630349110a0c/doc/api/module.md#L375-L376
 */
export const isolatedLoader = compareNodeVersion([20, 0, 0]) >= 0;

export const supportsModuleRegister = compareNodeVersion([20, 6, 0]) >= 0;

export const importAttributes = (
	compareNodeVersion([21, 0, 0]) >= 0
	|| compareNodeVersion([20, 10, 0]) >= 0
);

// Added in v21.0.0
// https://github.com/nodejs/node/releases/tag/v21.0.0
export const testRunnerGlob = compareNodeVersion([21, 0, 0]) >= 0;
