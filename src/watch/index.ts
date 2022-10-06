import type { ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { command } from 'cleye';
import typeFlag from 'type-flag';
import { watch } from 'chokidar';
import { run } from '../run';
import {
	clearScreen,
	debounce,
	isDependencyPath,
	log,
} from './utils';

const flags = {
	noCache: {
		type: Boolean,
		description: 'Disable caching',
		default: false,
	},
	tsconfig: {
		type: String,
		description: 'Custom tsconfig.json path',
	},
	clearScreen: {
		type: Boolean,
		description: 'Clearing the screen on rerun',
		default: true,
	},
	ignore: {
		type: [String],
		description: 'Paths & globs to exclude from being watched',
	},
} as const;

export const watchCommand = command({
	name: 'watch',
	parameters: ['<script path>'],
	flags,
	help: {
		description: 'Run the script and watch for changes',
	},
}, (argv) => {
	const args = typeFlag(
		flags,
		process.argv.slice(3),
		{ ignoreUnknown: true },
	)._;

	const options = {
		noCache: argv.flags.noCache,
		tsconfigPath: argv.flags.tsconfig,
		clearScreen: argv.flags.clearScreen,
		ignore: argv.flags.ignore,
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

				if (path.isAbsolute(dependencyPath)) {
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

				...options.ignore,
			],
			ignorePermissionErrors: true,
		},
	).on('all', reRun);

	// On "Return" key
	process.stdin.on('data', reRun);
});
