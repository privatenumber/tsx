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
const tsxPath = path.join(__dirname, '../../../dist/cli.js');

export const tsx = (
	options: Options,
) => execaNode(
	tsxPath,
	options.args,
	{
		env: {
			NODE_OPTIONS: '',
			ESBK_DISABLE_CACHE: '1',
		},
		nodePath: options.nodePath,
		nodeOptions: [],
		cwd: options.cwd,
		reject: false,
	},
);

export async function createNode(
	nodeVersion: string,
	fixturePath: string,
) {
	const node = await getNode(nodeVersion);

	return {
		version: node.version,
		path: node.path,
		packageType: '',
		get isCJS() {
			return this.packageType === 'commonjs';
		},
		load(
			filePath: string,
			options?: {
				cwd?: string;
			},
		) {
			return tsx(
				{
					args: [filePath],
					nodePath: node.path,
					cwd: path.join(fixturePath, options?.cwd ?? ''),
				},
			);
		},
		import(
			filePath: string,
			options?: {
				typescript?: boolean;
			},
		) {
			return tsx({
				args: [
					`./import-file${options?.typescript ? '.ts' : '.js'}`,
					filePath,
				],
				nodePath: node.path,
				cwd: fixturePath,
			});
		},
		require(
			filePath: string,
			options?: {
				typescript?: boolean;
			},
		) {
			return tsx({
				args: [
					`./require-file${options?.typescript ? '.cts' : '.cjs'}`,
					filePath,
				],
				nodePath: node.path,
				cwd: fixturePath,
			});
		},
	};
}

export type NodeApis = Awaited<ReturnType<typeof createNode>>;
