import type { ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { command } from 'cleye';
import { watch } from 'chokidar';
import { runBinary } from './run-binary';

// From ansi-escapes
// https://github.com/sindresorhus/ansi-escapes/blob/2b3b59c56ff77a/index.js#L80
const clearScreen = '\u001Bc';

function isDependencyPath(
	data: any,
): data is { type: 'dependency'; path: string } {
	return (
		data
		&& 'type' in data
		&& data.type === 'dependency'
	);
}

const nodeBinary = process.execPath;

export const watchCommand = command({
	name: 'watch',
	parameters: ['<script path>'],
	flags: {
		noCache: {
			type: Boolean,
			description: 'Disable caching',
		},
	},
	help: {
		description: 'Run the script and watch for changes',
	},
}, (argv) => {
	const options = {
		noCache: Boolean(argv.flags.noCache),
		ipc: true,
	};

	let runProcess: ChildProcess | undefined;
	function reRun() {
		if (runProcess && (!runProcess.killed && runProcess.exitCode === null)) {
			runProcess.kill();
		}

		process.stdout.write(clearScreen);

		runProcess = runBinary(nodeBinary, argv._, options);

		runProcess.on('message', (data) => {
			// Collect run-time dependencies to watch
			if (isDependencyPath(data)) {
				const dependencyPath = (
					data.path.startsWith('file:')
						? fileURLToPath(data.path)
						: data.path
				);

				if (dependencyPath.startsWith('/')) {
					// console.log('adding', dependencyPath);
					watcher.add(dependencyPath);
				}
			}
		});
	}

	reRun();

	// Kill process on CTRL+C
	function exit(exitCode: number) {
		if (runProcess) {
			runProcess.kill();
		}

		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(exitCode);
	}
	process.once('SIGINT', () => exit(130));
	process.once('SIGTERM', () => exit(143));

	/**
	 * Ideally, we can get a list of files loaded from the run above
	 * and only watch those files, but it's not possible to detect
	 * the full dependency-tree at run-time because they can be hidden
	 * in a if-condition/async-delay.
	 *
	 * As an alternative, we watch cwd and all run-time dependencies
	 */
	const watcher = watch(
		argv._,
		{
			ignoreInitial: true,
			ignored: [
				// Hidden directories like .git
				'**/.*/**',

				// 3rd party packages
				'**/{node_modules,bower_components,vendor}/**',

				// Distribution files
				'**/dist/**',
			],
			ignorePermissionErrors: true,
		},
	).on('all', reRun);

	// On "Return" key
	process.stdin.on('data', reRun);
});
