import { fileURLToPath } from 'node:url';
import { execaNode, type NodeOptions } from 'execa';
import {
	isFeatureSupported,
	moduleRegister,
	testRunnerGlob,
	type Version,
} from '../../src/utils/node-features.js';
import { getNode } from './get-node.js';

type Options = {
	args: string[];
	nodePath?: string;
	cwd?: string;
};

export const tsxPath = fileURLToPath(new URL('../../dist/cli.mjs', import.meta.url).toString());
export const tsxCjsPath = fileURLToPath(new URL('../../dist/cjs/index.cjs', import.meta.url).toString());
export const tsxCjsApiPath = fileURLToPath(new URL('../../dist/cjs/api/index.cjs', import.meta.url).toString());
export const tsxEsmPath = new URL('../../dist/esm/index.mjs', import.meta.url).toString();
export const tsxEsmApiPath = new URL('../../dist/esm/api/index.mjs', import.meta.url).toString();
export const tsxEsmApiCjsPath = fileURLToPath(new URL('../../dist/esm/api/index.cjs', import.meta.url).toString());

const cjsPatchPath = fileURLToPath(new URL('../../dist/cjs/index.cjs', import.meta.url).toString());
const hookPath = new URL('../../dist/esm/index.cjs', import.meta.url).toString();

export const tsx = (
	options: Options,
) => execaNode(
	tsxPath,
	options.args,
	{
		env: {
			TSX_DISABLE_CACHE: '1',
			DEBUG: '1',
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
	const node = await getNode(nodeVersion);
	const versionParsed = node.version.split('.').map(Number) as Version;
	const supports = {
		moduleRegister: isFeatureSupported(moduleRegister, versionParsed),

		testRunnerGlob: isFeatureSupported(testRunnerGlob, versionParsed),

		// https://nodejs.org/docs/latest-v18.x/api/cli.html#--test
		cliTestFlag: isFeatureSupported([[18, 1, 0]], versionParsed),
	};
	const hookFlag = supports.moduleRegister ? '--import' : '--loader';

	return {
		version: node.version,

		path: node.path,

		supports,

		tsx: (
			args: string[],
			cwdOrOptions?: string | NodeOptions,
		) => {
			const isCwd = typeof cwdOrOptions === 'string';
			return execaNode(
				tsxPath,
				args,
				{
					nodePath: node.path,
					nodeOptions: [],
					reject: false,
					all: true,
					...(
						isCwd
							? { cwd: cwdOrOptions }
							: cwdOrOptions
					),
					env: {
						TSX_DISABLE_CACHE: '1',
						DEBUG: '1',
						...(
							(cwdOrOptions && !isCwd)
								? cwdOrOptions.env
								: {}
						),
					},
				},
			);
		},

		cjsPatched: (
			args: string[],
			cwd?: string,
		) => execaNode(args[0], args.slice(1), {
			cwd,
			nodePath: node.path,
			nodeOptions: ['--require', cjsPatchPath],
		}),

		hook: (
			args: string[],
			cwd?: string,
		) => execaNode(args[0], args.slice(1), {
			cwd,
			nodePath: node.path,
			nodeOptions: [hookFlag, hookPath],
		}),
	};
};

export type NodeApis = Awaited<ReturnType<typeof createNode>>;
