// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { command } from 'cleye';
import { watch } from 'chokidar';
import { run } from '../run';
import { removeArgvFlags, ignoreAfterArgument } from '../remove-argv-flags';
import {
	type SignalHandler,
	getErrorCode,
	handleSignal,
	installClientSignalAckHandler,
} from '../signals';
// eslint-disable-next-line object-curly-newline
import { clearScreen, debounce, isDependencyPath, log, timeout } from './utils';

const MAX_WAIT_TIME = 5000;

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

export const watchCommand = command(
	{
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
	},
	(argv) => {
		const rawArgvs = removeArgvFlags(flags, process.argv.slice(3));
		const options = {
			noCache: argv.flags.noCache,
			tsconfigPath: argv.flags.tsconfig,
			clearScreen: argv.flags.clearScreen,
			ignore: argv.flags.ignore,
			ipc: true,
		};

		let runProcess: ChildProcess | undefined;
		let running = false;
		let waiting = false;
		let sigint: SignalHandler;
		let sigterm: SignalHandler;
		let errorListener;
		let exitListener;

		const runner = debounce(async () => {
			if (waiting) {
				return;
			}
			if (running) {
				waiting = true;
				runProcess!.off('error', errorListener!);
				runProcess!.off('exit', exitListener!);
				sigint!.uninstall();
				sigterm!.uninstall();
				log(
					`Process running: sending SIGTERM and waiting for up to ${
						MAX_WAIT_TIME / 1000
					} seconds...`,
				);
				runProcess?.kill('SIGTERM');
				let listener;
				const untilProcessExits = new Promise<void>((resolve) => {
					listener = (code: number | null) => {
						log(
							`Process exited with status code: ${getErrorCode(
								runProcess!,
								code === null ? 0 : code,
							)}`,
						);
						resolve();
					};
					runProcess!.once('exit', listener);
				});
				try {
					await timeout(
						untilProcessExits,
						() => runProcess!.off('exit', listener!),
						MAX_WAIT_TIME,
					);
				} catch {
					log('Timeout: sending SIGKILL');
					runProcess?.kill('SIGKILL');
				}
				running = false;
				waiting = false;
			}
			// Not first run
			if (runProcess) {
				log('Running');
			}

			if (options.clearScreen) {
				process.stdout.write(clearScreen);
			}

			runProcess = run(rawArgvs, options);
			running = true;
			runProcess.on('message', (data) => {
				// Collect run-time dependencies to watch
				if (isDependencyPath(data)) {
					const dependencyPath = data.path.startsWith('file:')
						? fileURLToPath(data.path)
						: data.path;

					if (path.isAbsolute(dependencyPath)) {
						// console.log('adding', dependencyPath);
						watcher.add(dependencyPath);
					}
				}
			});

			sigint = handleSignal('SIGINT', runProcess);
			sigterm = handleSignal('SIGTERM', runProcess);

			sigint.install();
			sigterm.install();

			installClientSignalAckHandler(runProcess);

			errorListener = (error: Error) => {
				running = false;
				sigint.uninstall();
				sigterm.uninstall();
				// On "Return" key
				process.stdin.once('data', runner);
				log(error);
				if (runProcess !== null) {
					log(`Process error: ${getErrorCode(runProcess!, 1)}`);
				} else {
					log('Process exited. Press enter/return to run again');
				}
				log('Press enter/return to run again, or ctrl-C to terminate.');
			};
			exitListener = (code: number | null) => {
				running = false;
				sigint.uninstall();
				sigterm.uninstall();
				// On "Return" key
				process.stdin.once('data', runner);
				if (runProcess !== null) {
					log(
						`Process exited with status code: ${getErrorCode(
							runProcess!,
							code === null ? 0 : code,
						)}`,
					);
				} else {
					log('Process exited.');
				}
				log('Press enter/return to run again, or ctrl-C to terminate.');
			};
			runProcess.once('error', errorListener);
			runProcess.once('exit', exitListener);
		}, 100);

		runner();

		/**
		 * Ideally, we can get a list of files loaded from the run above
		 * and only watch those files, but it's not possible to detect
		 * the full dependency-tree at run-time because they can be hidden
		 * in a if-condition/async-delay.
		 *
		 * As an alternative, we watch cwd and all run-time dependencies
		 */
		const watcher = watch(argv._, {
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
		}).on('all', runner);
	},
);
