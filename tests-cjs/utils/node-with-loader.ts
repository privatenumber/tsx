import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execaNode, execa } from 'execa';
import getNode from 'get-node';

type Options = {
	args: string[];
	nodePath: string;
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	nodeOptions?: string[];
};

const cjsLoaderPath = fileURLToPath(new URL('../../dist/cjs/index.cjs', import.meta.url));

export const nodeWithLoader = async (
	options: Options,
) => await execaNode(
	options.args[0],
	options.args.slice(1),
	{
		env: {
			ESBK_DISABLE_CACHE: '1',
			...options.env,
		},
		nodeOptions: [
			...(options.nodeOptions ?? []),

			'--require',
			cjsLoaderPath,
		],
		nodePath: options.nodePath,
		cwd: options.cwd,
		reject: false,
	},
);

let id = 0;
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
		importDynamic(
			filePath: string,
			options?: {
				mode?: 'commonjs' | 'typescript';
			},
		) {
			let extension = 'js';

			const mode = options?.mode;
			if (mode === 'typescript') {
				extension = 'ts';
			} else if (mode === 'commonjs') {
				extension = 'cjs';
			}

			return nodeWithLoader({
				args: [
					`./import-file.${extension}`,
					filePath,
				],
				nodePath: node.path,
				cwd: fixturePath,
			});
		},
		async importStatic(
			filePath: string,
			options?: {
				extension?: string;
			},
		) {
			id += 1;
			const importerFileName = `static-import-file.${id}.${options?.extension || 'js'}`;
			const importerFilePath = path.join(fixturePath, importerFileName);
			await fs.writeFile(
				importerFilePath,
				`
				import * as value from '${filePath}';
				console.log(JSON.stringify(value));
				`,
			);

			try {
				return await nodeWithLoader({
					args: [
						importerFileName,
					],
					nodePath: node.path,
					cwd: fixturePath,
				});
			} finally {
				await fs.rm(importerFilePath);
			}
		},
		require(
			filePath: string,
			options?: {
				typescript?: boolean;
			},
		) {
			return nodeWithLoader({
				args: [
					`./require-file${options?.typescript ? '.ts' : '.js'}`,
					filePath,
				],
				nodePath: node.path,
				cwd: fixturePath,
			});
		},
		requireFlag(
			filePath: string,
			options?: {
				cwd?: string;
			},
		) {
			return execa(
				node.path,
				[
					'--require',
					cjsLoaderPath,
					'--require',
					filePath,
					'--eval',
					'null',
				],
				{
					cwd: path.join(fixturePath, options?.cwd ?? ''),
					env: {
						ESBK_DISABLE_CACHE: '1',
					},
				},
			);
		},
	};
}

export type NodeApis = Awaited<ReturnType<typeof createNode>>;
