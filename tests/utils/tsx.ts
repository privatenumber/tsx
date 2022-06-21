import fs from 'fs/promises';
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
			ESBK_DISABLE_CACHE: '1',
		},
		nodePath: options.nodePath,
		nodeOptions: [],
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

			const nodeProcess = await tsx({
				args: [
					importerFileName,
				],
				nodePath: node.path,
				cwd: fixturePath,
			});

			await fs.rm(importerFilePath);

			return nodeProcess;
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
