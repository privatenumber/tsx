import type { StdioOptions } from 'child_process';
import { pathToFileURL } from 'url';
import spawn from 'cross-spawn';
import { supportsModuleRegister } from './utils/node-features';

export const run = (
	argv: string[],
	options?: {
		noCache?: boolean;
		tsconfigPath?: string;
		ipc?: boolean;
	},
) => {
	const environment = { ...process.env };
	const stdio: StdioOptions = [
		'inherit', // stdin
		'inherit', // stdout
		'inherit', // stderr
	];

	// If parent process spawns tsx with ipc, spawn child with ipc
	if (process.send) {
		stdio.push('ipc');
	}

	if (options) {
		if (options.noCache) {
			environment.TSX_DISABLE_CACHE = '1';
		}

		if (options.tsconfigPath) {
			environment.TSX_TSCONFIG_PATH = options.tsconfigPath;
		}
	}

	return spawn(
		process.execPath,
		[
			'--require',
			require.resolve('./preflight.cjs'),

			supportsModuleRegister ? '--import' : '--loader',
			pathToFileURL(require.resolve('./loader.mjs')).toString(),

			...argv,
		],
		{
			stdio,
			env: environment,
		},
	);
};
