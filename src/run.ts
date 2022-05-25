import type { StdioOptions } from 'child_process';
import { pathToFileURL } from 'url';
import spawn from 'cross-spawn';

export function run(
	argv: string[],
	options?: {
		noCache?: boolean;
		ipc?: boolean;
	},
) {
	const environment = {
		...process.env,
	};

	if (options?.noCache) {
		environment.ESBK_DISABLE_CACHE = '1';
	}

	const stdio: StdioOptions = [
		'inherit', // stdin
		'inherit', // stdout
		'inherit', // stderr
	];

	if (options?.ipc) {
		// To communicate with parent process
		stdio.push('ipc');
	}

	const childProcess = spawn(
		process.execPath,
		[
			'--require',
			require.resolve('./suppress-warnings.cjs'),

			'--loader',
			pathToFileURL(require.resolve('./loader.js')).toString(),

			...argv,
		],
		{
			stdio,
			env: environment,
		},
	);

	return childProcess;
}
