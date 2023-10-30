import path from 'path';
import { fileURLToPath } from 'url';
import { execaNode } from 'execa';
import getNode from 'get-node';

type Options = {
	args: string[];
	nodePath?: string;
	cwd?: string;
};

const __dirname = fileURLToPath(import.meta.url);
export const tsxPath = path.join(__dirname, '../../../dist/cli.mjs');

export const tsx = (
	options: Options,
) => execaNode(
	tsxPath,
	options.args,
	{
		env: {
			ESBK_DISABLE_CACHE: '1',
		},
		nodePath: options.nodePath,
		nodeOptions: [],
		cwd: options.cwd,
		reject: false,
		all: true,
	},
);

export const createNode = async (
	nodeVersion: string,
) => {
	console.log('Getting node', nodeVersion);
	const startTime = Date.now();
	const node = await getNode(nodeVersion, {
		progress: true,
	});
	console.log('Got node', Date.now() - startTime, node);

	return {
		version: node.version,
		tsx(
			args: string[],
			cwd?: string,
		) {
			return execaNode(
				tsxPath,
				args,
				{
					cwd,
					env: {
						ESBK_DISABLE_CACHE: '1',
					},
					nodePath: node.path,
					nodeOptions: [],
					reject: false,
					all: true,
				},
			);
		},
	};
};

export type NodeApis = Awaited<ReturnType<typeof createNode>>;
