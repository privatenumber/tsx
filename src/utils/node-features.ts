export type Version = [number, number, number];

const currentNodeVersion = process.versions.node.split('.').map(Number) as Version;

export const compareNodeVersion = (
	version: Version,
	nodeVersion = currentNodeVersion,
) => (
	nodeVersion[0] - version[0]
	|| nodeVersion[1] - version[1]
	|| nodeVersion[2] - version[2]
);

export const supportsModuleRegister = (
	compareNodeVersion([20, 6, 0]) >= 0
	|| (
		compareNodeVersion([20, 0, 0]) < 0
		&& compareNodeVersion([18, 19, 0]) >= 0
	)
);

export const importAttributes = (
	compareNodeVersion([21, 0, 0]) >= 0
	|| compareNodeVersion([20, 10, 0]) >= 0
	|| (
		compareNodeVersion([20, 0, 0]) < 0
		&& compareNodeVersion([18, 19, 0]) >= 0
	)
);

// Added in v21.0.0
// https://github.com/nodejs/node/releases/tag/v21.0.0
export const testRunnerGlob = compareNodeVersion([21, 0, 0]) >= 0;
