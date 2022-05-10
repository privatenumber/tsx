import type { StdioOptions } from 'child_process';
import { pathToFileURL } from 'url';
import spawn from 'cross-spawn';
import { ignoreNodeWarnings } from './ignore-node-warnings';

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
		'pipe', // stderr
	];

	if (options?.ipc) {
		// To communicate with parent process
		stdio.push('ipc');
	}

	const childProcess = spawn(
		process.execPath,
		[
			// Hook import/import() to transform to ESM
			// Can be used in Node v12 to support dynamic `import()`
			'--loader',
			pathToFileURL(require.resolve('@esbuild-kit/esm-loader')).toString(),

			// Hook require() to transform to CJS
			'--require',
			require.resolve('@esbuild-kit/cjs-loader'),

			...argv,
		],
		{
			stdio,
			env: environment,
		},
	);

	// Suppress warnings about using experimental features
	childProcess.stderr!
		.pipe(ignoreNodeWarnings())
		.pipe(process.stderr);

	return childProcess;
}
