import type { ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { constants as osConstants } from 'os';
import path from 'path';
import { command } from 'cleye';
import { watch } from 'chokidar';
import { lightMagenta, lightGreen, yellow } from 'kolorist';
import { run } from '../run.js';
import {
	removeArgvFlags,
	ignoreAfterArgument,
} from '../remove-argv-flags.js';
import { createIpcServer } from '../utils/ipc/server.js';
import {
	clearScreen,
	debounce,
	log,
} from './utils.js';

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
}, async (argv) => {
	const rawArgvs = removeArgvFlags(flags, process.argv.slice(3));
	const options = {
		noCache: argv.flags.noCache,
		tsconfigPath: argv.flags.tsconfig,
		clearScreen: argv.flags.clearScreen,
		ignore: argv.flags.ignore,
		ipc: true,
	};

	let runProcess: ChildProcess | undefined;
	let exiting = false;

	const server = await createIpcServer();

	server.on('data', (data) => {
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
				watcher.add(dependencyPath);
			}
		}
	});

	const spawnProcess = () => {
		if (exiting) {
			return;
		}

		return run(rawArgvs, options);
	};

	let waitingChildExit = false;

	const killProcess = async (
		childProcess: ChildProcess,
		signal: NodeJS.Signals = 'SIGTERM',
		forceKillOnTimeout = 5000,
	) => {
		let exited = false;
		const waitForExit = new Promise<number | null>((resolve) => {
			childProcess.on('exit', (exitCode) => {
				exited = true;
				waitingChildExit = false;
				resolve(exitCode);
			});
		});

		waitingChildExit = true;
		childProcess.kill(signal);

		setTimeout(() => {
			if (!exited) {
				log(yellow(`Process didn't exit in ${Math.floor(forceKillOnTimeout / 1000)}s. Force killing...`));
				childProcess.kill('SIGKILL');
			}
		}, forceKillOnTimeout);

		return await waitForExit;
	};

	const reRun = debounce(async (event?: string, filePath?: string) => {
		const reason = event ? `${event ? lightMagenta(event) : ''}${filePath ? ` in ${lightGreen(`./${filePath}`)}` : ''}` : '';

		if (waitingChildExit) {
			log(reason, yellow('Process hasn\'t exited. Killing process...'));
			runProcess!.kill('SIGKILL');
			return;
		}

		// If not first run
		if (runProcess) {
			// If process still running
			if (runProcess.exitCode === null) {
				log(reason, yellow('Restarting...'));
				await killProcess(runProcess);
			} else {
				log(reason, yellow('Rerunning...'));
			}

			if (options.clearScreen) {
				process.stdout.write(clearScreen);
			}
		}

		runProcess = spawnProcess();
	}, 100);

	reRun();

	const relaySignal = (signal: NodeJS.Signals) => {
		// Disable further spawns
		exiting = true;

		// Child is still running, kill it
		if (runProcess?.exitCode === null) {
			if (waitingChildExit) {
				log(yellow('Previous process hasn\'t exited yet. Force killing...'));
			}

			killProcess(
				runProcess,
				// Second Ctrl+C force kills
				waitingChildExit ? 'SIGKILL' : signal,
			).then(
				(exitCode) => {
					process.exit(exitCode ?? 0);
				},
				() => {},
			);
		} else {
			process.exit(osConstants.signals[signal]);
		}
	};

	process.on('SIGINT', relaySignal);
	process.on('SIGTERM', relaySignal);

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
	process.stdin.on('data', () => reRun('Return key'));
});
