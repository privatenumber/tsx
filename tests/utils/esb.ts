import path from 'path';
import { fileURLToPath } from 'url';
import { execaNode } from 'execa';
import getNode from 'get-node';

type Options = {
	args: string[];
	nodePath: string;
	cwd?: string;
};

const __dirname = fileURLToPath(import.meta.url);
const esbPath = path.join(__dirname, '../../../dist/cli.js');

export const esb = async (
	options: Options,
) => await execaNode(
	esbPath,
	options.args,
	{
		env: {
			ESBK_DISABLE_CACHE: '1',
		},
		nodePath: options.nodePath,
		nodeOptions: [],
		cwd: options.cwd,
	},
).catch(error => error);

export async function createNode(
	nodeVersion: string,
	fixturePath: string,
) {
	const node = await getNode(nodeVersion);

	return {
		version: node.version,
		packageType: '',
		load(
			filePath: string,
			options?: {
				cwd?: string;
			},
		) {
			return esb(
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
			return esb({
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
			return esb({
				args: [
					`./require-file${options?.typescript ? '.ts' : '.js'}`,
					filePath,
				],
				nodePath: node.path,
				cwd: fixturePath,
			});
		},
	};
}

export type NodeApis = Awaited<ReturnType<typeof createNode>>;
