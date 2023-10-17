type Version = [number, number, number];

const nodeVersion = process.versions.node.split('.').map(Number) as Version;

const compareNodeVersion = (version: Version) => (
	nodeVersion[0] - version[0]
	|| nodeVersion[1] - version[1]
	|| nodeVersion[2] - version[2]
);

export const nodeSupportsImport = (
	// v13.2.0 and higher
	compareNodeVersion([13, 2, 0]) >= 0

	// 12.20.0 ~ 13.0.0
	|| (
		compareNodeVersion([12, 20, 0]) >= 0
		&& compareNodeVersion([13, 0, 0]) < 0
	)
);

export const supportsNodePrefix = (
	compareNodeVersion([16, 0, 0]) >= 0
	|| compareNodeVersion([14, 18, 0]) >= 0
);

export const nodeSupportsDeprecatedLoaders = compareNodeVersion([16, 12, 0]) < 0;

/**
 * Node.js loaders are isolated from v20
 * https://github.com/nodejs/node/issues/49455#issuecomment-1703812193
 * https://github.com/nodejs/node/blob/33710e7e7d39d19449a75911537d630349110a0c/doc/api/module.md#L375-L376
 */
export const isolatedLoader = compareNodeVersion([20, 0, 0]) >= 0;

export const supportsModuleRegister = compareNodeVersion([20, 6, 0]) >= 0;
