import getNode from 'get-node';

export type NodeBinary = {
	version: string;
	path: string;
};

/**
 * Resolves a Node version to a binary path, downloading via get-node if needed.
 * Omitted / current version reuses the running binary (no download).
 */
export const resolveNode = async (
	version?: string,
): Promise<NodeBinary> => {
	if (
		!version
		|| version === process.version
		|| version === process.versions.node
	) {
		return {
			version: process.versions.node,
			path: process.execPath,
		};
	}

	const node = await getNode(version, { progress: true });
	return {
		version: node.version,
		path: node.path,
	};
};
