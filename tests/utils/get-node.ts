import _getNode from 'get-node';

export const getNode = async (
	nodeVersion: string,
) => {
	if (nodeVersion === process.version) {
		return {
			version: process.versions.node,
			path: process.execPath,
		};
	}

	console.log('Getting node', nodeVersion);
	const startTime = Date.now();
	const node = await _getNode(nodeVersion, {
		progress: true,
	});
	console.log(`Got node in ${Date.now() - startTime}ms`, node);

	return node;
};
