import fs from 'fs';
import type { StdioOptions } from 'child_process';
import { pathToFileURL } from 'url';
import spawn from 'cross-spawn';
import { ignoreNodeWarnings } from './ignore-node-warnings';

const pathExists = (filePath: string) => fs.promises.access(filePath).then(() => true, () => false);

const isPathPattern = /^\.|\//;

export const isBinaryPath = async (filePath: string) => {
	if (isPathPattern.test(filePath)) {
		return false;
	}

	const fileExists = await pathExists(filePath);

	if (fileExists) {
		return false;
	}

	const binaryPath = `./node_modules/.bin/${filePath}`;
	if (await pathExists(binaryPath)) {
		return binaryPath;
	}

	return false;
};

export function runBinary(
	binaryPath: string,
	argv: string[],
	options?: {
		noCache?: boolean;
		ipc?: boolean;
	},
) {
	const environment: Record<string, string> = {
		...process.env,
		NODE_OPTIONS: `--loader ${pathToFileURL(require.resolve('./loader.js')).toString()}`,
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
		binaryPath,
		argv,
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
