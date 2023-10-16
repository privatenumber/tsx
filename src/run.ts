import type { StdioOptions } from 'child_process';
import { pathToFileURL } from 'url';
import spawn from 'cross-spawn';
import { compareNodeVersion } from './utils/compare-node-version';

const supportsModuleRegister = compareNodeVersion([20, 6, 0]) >= 0;

export function run(
	argv: string[],
	options?: {
		noCache?: boolean;
		tsconfigPath?: string;
		ipc?: boolean;
	},
) {
	const environment = { ...process.env };
	const stdio: StdioOptions = [
		'inherit', // stdin
		'inherit', // stdout
		'inherit', // stderr
		'ipc', // parent-child communication
	];

	if (options) {
		if (options.noCache) {
			environment.ESBK_DISABLE_CACHE = '1';
		}

		if (options.tsconfigPath) {
			environment.ESBK_TSCONFIG_PATH = options.tsconfigPath;
		}
	}

	return spawn(
		process.execPath,
		[
			'--require',
			require.resolve('./preflight.cjs'),

			...(
				supportsModuleRegister
					? [
						'--import',
						pathToFileURL(require.resolve('./esm-import.mjs')).toString(),
					]
					: [
						'--loader',
						pathToFileURL(require.resolve('./loader.mjs')).toString(),
					]
			),

			...argv,
		],
		{
			stdio,
			env: environment,
		},
	);
}
