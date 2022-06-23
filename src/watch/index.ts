import type { ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { command } from 'cleye';
import { watch } from 'chokidar';
import { run } from '../run';
import {
	clearScreen,
	debounce,
	kebab,
	isDependencyPath,
	log,
} from './utils';

const flags = {
	noCache: {
		type: Boolean,
		description: 'Disable caching',
		default: false,
	},
	clearScreen: {
		type: Boolean,
		description: 'Clearing the screen on rerun',
		default: true,
	},
};

const flagNames = Object.keys(flags).flatMap(
	flagName => [`--${flagName}`, `--${kebab(flagName)}`],
);

export const watchCommand = command({
	name: 'watch',
	parameters: ['<script path>'],
	flags,
	help: {
		description: 'Run the script and watch for changes',
	},
}, (argv) => {
	const args = process.argv.slice(3).filter(
		argument => !flagNames.find(flagName => argument.startsWith(flagName)),
	);

	const options = {
		noCache: argv.flags.noCache,
		clearScreen: argv.flags.clearScreen,
		ipc: true,
	};

	let runProcess: ChildProcess | undefined;

	const reRun = debounce(() => {
		if (
			runProcess
			&& (!runProcess.killed && runProcess.exitCode === null)
		) {
			runProcess.kill();
		}

		// Not first run
		if (runProcess) {
			log('rerunning');
		}

		if (options.clearScreen) {
			process.stdout.write(clearScreen);
		}

		runProcess = run(args, options);

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
	}, 100);

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
