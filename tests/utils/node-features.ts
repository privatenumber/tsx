export type Version = [number, number, number];

export const compareNodeVersion = (
	version: Version,
	nodeVersion: Version,
) => (
	nodeVersion[0] - version[0]
	|| nodeVersion[1] - version[1]
	|| nodeVersion[2] - version[2]
);
