type Version = [number, number, number];

const nodeVersion = process.versions.node.split('.').map(Number) as Version;

export const compareNodeVersion = (version: Version) => (
	nodeVersion[0] - version[0]
	|| nodeVersion[1] - version[1]
	|| nodeVersion[2] - version[2]
);
