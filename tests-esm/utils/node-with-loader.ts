import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath, pathToFileURL } from 'url';
import { execaNode } from 'execa';
import getNode from 'get-node';

type Options = {
	args: string[];
	nodePath: string;
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	nodeOptions?: string[];
};

const __dirname = fileURLToPath(import.meta.url);

export const nodeWithLoader = (
	options: Options,
) => execaNode(
	options.args[0],
	options.args.slice(1),
	{
		env: {
			ESBK_DISABLE_CACHE: '1',
			TEST: '1',
			...options.env,
		},
		nodeOptions: [
			...(options.nodeOptions ?? []),

			'--loader',
			pathToFileURL(
				path.resolve(__dirname, '../../../dist/esm/index.mjs'),
			).toString(),
		],
		nodePath: options.nodePath,
		cwd: options.cwd,
		reject: false,
		all: true,
	},
);

export async function createNode(
	nodeVersion: string,
	fixturePath: string,
) {
	const node = await getNode(nodeVersion);

	return {
		version: node.version,
		load(
			filePath: string,
			options?: {
				cwd?: string;
				env?: typeof process.env;
				nodeOptions?: string[];
			},
		) {
			return nodeWithLoader(
				{
					args: [filePath],
					nodePath: node.path,
					cwd: path.resolve(fixturePath, options?.cwd ?? ''),
					env: options?.env,
					nodeOptions: options?.nodeOptions,
				},
			);
		},

		import(
			filePath: string,
			options?: {
				typescript?: boolean;
			},
		) {
			return nodeWithLoader({
				args: [
					`./import-file${options?.typescript ? '.ts' : '.js'}`,
					filePath,
				],
				nodePath: node.path,
				cwd: fixturePath,
			});
		},

		loadFile(
			cwd: string,
			filePath: string,
			options?: {
				env?: typeof process.env;
				nodeOptions?: string[];
			},
		) {
			return nodeWithLoader(
				{
					args: [filePath],
					nodePath: node.path,
					cwd,
					env: options?.env,
					nodeOptions: options?.nodeOptions,
				},
			);
		},

		async importFile(
			cwd: string,
			importFrom: string,
			fileExtension = '.js',
		) {
			const fileName = `_${Math.random().toString(36).slice(2)}${fileExtension}`;
			const filePath = path.resolve(cwd, fileName);
			await fs.writeFile(filePath, `import * as _ from '${importFrom}';console.log(_)`);
			try {
				return await this.loadFile(cwd, filePath);
			} finally {
				await fs.rm(filePath);
			}
		},
	};
}

export type NodeApis = Awaited<ReturnType<typeof createNode>>;
