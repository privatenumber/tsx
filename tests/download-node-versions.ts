import getNode from 'get-node';
import { nodeVersions } from './utils/node-versions';

await Promise.all(
	nodeVersions.map(async (nodeVersion) => {
		console.log('Downloading Node', nodeVersion);
		const startTime = Date.now();
		const node = await getNode(nodeVersion, {
			progress: true,
		});
		const elapsed = Date.now() - startTime;
		console.log('Downloaded', {
			nodeVersion,
			elapsed,
			node,
		});
	}),
);
