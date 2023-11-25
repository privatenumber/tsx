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
			stdio: 'inherit',
			env: environment,
		},
	);
};
