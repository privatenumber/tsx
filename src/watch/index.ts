import type { ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { constants as osConstants } from 'os';
import path from 'path';
import { command } from 'cleye';
import { watch } from 'chokidar';
import { run } from '../run';
import {
	removeArgvFlags,
	ignoreAfterArgument,
} from '../remove-argv-flags';
import {
	clearScreen,
	debounce,
	log,
} from './utils';

const killProcess = async (
	childProcess: ChildProcess,
) => {
	const waitForExit = new Promise((resolve) => {
		childProcess.on('exit', resolve);
	});

	childProcess.kill();

	await waitForExit;
};

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

	/**
	 * ignoreAfterArgument needs to parse the first argument
	 * because cleye will error on missing arguments
	 *
	 * Remove once cleye supports error callbacks on missing arguments
	 */
	ignoreArgv: ignoreAfterArgument(false),
}, (argv) => {
	const rawArgvs = removeArgvFlags(flags, process.argv.slice(3));
	const options = {
		noCache: argv.flags.noCache,
		tsconfigPath: argv.flags.tsconfig,
		clearScreen: argv.flags.clearScreen,
		ignore: argv.flags.ignore,
		ipc: true,
	};

	let runProcess: ChildProcess | undefined;

	const spawnProcess = () => {
		const childProcess = run(rawArgvs, options);

		childProcess.on('message', (data) => {
			// Collect run-time dependencies to watch
			if (
				data
				&& typeof data === 'object'
				&& 'type' in data
				&& data.type === 'dependency'
				&& 'path' in data
				&& typeof data.path === 'string'
			) {
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

		return childProcess;
	};

	let waitingExits = false;
	const reRun = debounce(async () => {
		if (waitingExits) {
			log('forcing restart');
			runProcess!.kill('SIGKILL');
			return;
		}

		// If running process
		if (runProcess?.exitCode === null) {
			log('restarting');
			waitingExits = true;
			await killProcess(runProcess);
			waitingExits = false;
		} else {
			log('rerunning');
		}

		if (options.clearScreen) {
			process.stdout.write(clearScreen);
		}

		runProcess = spawnProcess();
	}, 100);

	reRun();

	function exit(signal: NodeJS.Signals) {
		/**
		 * In CLI mode where there is only one run, we can inherit the child's exit code.
		 * But in watch mode, the exit code should reflect the kill signal.
		 */

		process.exit(
			/**
			 * https://nodejs.org/api/process.html#exit-codes
			 * >128 Signal Exits: If Node.js receives a fatal signal such as SIGKILL or SIGHUP,
			 * then its exit code will be 128 plus the value of the signal code. This is a
			 * standard POSIX practice, since exit codes are defined to be 7-bit integers, and
			 * signal exits set the high-order bit, and then contain the value of the signal
			 * code. For example, signal SIGABRT has value 6, so the expected exit code will be
			 * 128 + 6, or 134.
			 */
			128 + osConstants.signals[signal],
		);
	}

	function relaySignal(signal: NodeJS.Signals) {
		// Child is still running
		if (runProcess && runProcess.exitCode === null) {
			// Wait for child to exit
			runProcess.on('close', () => exit(signal));
			runProcess.kill(signal);
		} else {
			exit(signal);
		}
	}

	process.once('SIGINT', relaySignal);
	process.once('SIGTERM', relaySignal);

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
			cwd: process.cwd(),
			ignoreInitial: true,
			ignored: [
				// Hidden directories like .git
				'**/.*/**',

				// Hidden files (e.g. logs or temp files)
				'**/.*',

				// 3rd party packages
				'**/{node_modules,bower_components,vendor}/**',

				...options.ignore,
			],
			ignorePermissionErrors: true,
		},
	).on('all', reRun);

	// On "Return" key
	process.stdin.on('data', reRun);
});
