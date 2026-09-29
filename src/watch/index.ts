import type { ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { constants as osConstants } from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { command } from 'cleye';
import { FSWatcher } from 'chokidar';
import isGlob from 'is-glob';
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
	// Deprecated
	ignore: {
		type: [String],
		description: 'Paths & globs to exclude from being watched (Deprecated: use --exclude)',
	},
	include: {
		type: [String],
		description: 'Additional paths & globs to watch',
	},
	exclude: {
		type: [String],
		description: 'Paths & globs to exclude from being watched',
	},
	reloadOnKeypress: {
		type: Boolean,
		description: 'Reload on keypress (press Return key to manually rerun). Disable if your process uses stdin raw mode.',
		default: true,
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
		include: argv.flags.include,
		exclude: [
			...argv.flags.ignore,
			...argv.flags.exclude,
		],
		ipc: true,
	};

	let runProcess: ChildProcess | undefined;
	let exiting = false;
	const cwd = process.cwd();
	const canonicalPathCache = new Map<string, {
		path: string;
		expiration: NodeJS.Timeout;
	}>();
	const getEventKey = (
		event: string,
		filePath: string,
	) => {
		const absolutePath = path.resolve(filePath);
		const cachedPath = canonicalPathCache.get(absolutePath);
		if (event === 'add' || event === 'addDir' || event === 'unlink' || event === 'unlinkDir') {
			if (cachedPath) {
				clearTimeout(cachedPath.expiration);
				canonicalPathCache.delete(absolutePath);
			}
		} else if (cachedPath) {
			return `${event}:${cachedPath.path}`;
		}

		let pathKey: string;
		try {
			// Event handlers need a synchronous key before either watcher reports
			// the same change; cache removes the syscall from later events.
			pathKey = fs.realpathSync.native(absolutePath);
		} catch {
			// Removed paths cannot be resolved and retain their emitted spelling.
			pathKey = absolutePath;
		}
		const cacheRecord = {
			path: pathKey,
			expiration: setTimeout(() => {
				if (canonicalPathCache.get(absolutePath) === cacheRecord) {
					canonicalPathCache.delete(absolutePath);
				}
			}, 1000),
		};
		cacheRecord.expiration.unref();
		canonicalPathCache.set(absolutePath, cacheRecord);
		return `${event}:${pathKey}`;
	};
	const literalWatchPaths = argv._.map(filePath => path.resolve(filePath));
	let literalWatcher: FSWatcher;
	let dependencyOverrideWatcher: FSWatcher | undefined;
	let watchersReady = false;
	const recentWatchEvents = new Map<string, {
		source: 'include' | 'literal';
		expiration: NodeJS.Timeout;
	}>();
	const getPathKey = (filePath: string) => {
		const absolutePath = path.resolve(filePath);
		return process.platform === 'win32' ? absolutePath.toLowerCase() : absolutePath;
	};
	const exactNegatedIncludes = new Set<string>();
	for (const includePattern of options.include) {
		if (includePattern.startsWith('!')) {
			const negatedPattern = includePattern.slice(1);
			if (!isGlob(negatedPattern)) {
				exactNegatedIncludes.add(getPathKey(negatedPattern));
			}
		} else if (!isGlob(includePattern)) {
			exactNegatedIncludes.delete(getPathKey(includePattern));
		}
	}

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
				if (exactNegatedIncludes.has(getPathKey(dependencyPath))) {
					if (!dependencyOverrideWatcher) {
						dependencyOverrideWatcher = new FSWatcher({
							...watchOptions,
							disableGlobbing: true,
						});
						dependencyOverrideWatcher.on('all', (event, filePath) => {
							handleWatchEvent('literal', event, filePath);
						});
					}
					dependencyOverrideWatcher.add(dependencyPath);
				} else {
					literalWatcher.add(dependencyPath);
				}
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

			// Only clear terminals; control sequences corrupt piped output
			// https://github.com/privatenumber/tsx/issues/184
			if (options.clearScreen && process.stdout.isTTY) {
				process.stdout.write(clearScreen);
			}
		}

		runProcess = spawnProcess();
	}, 100);

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
					// eslint-disable-next-line n/no-process-exit
					process.exit(exitCode ?? 0);
				},
				() => {},
			);
		} else {
			// Exit with 128 + signal number, as done by Node.js & POSIX shells
			// https://nodejs.org/api/process.html#exit-codes
			// eslint-disable-next-line n/no-process-exit
			process.exit(128 + osConstants.signals[signal]);
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
	const watchOptions = {
		cwd,
		ignoreInitial: true,
		ignored: [
			// Hidden directories like .git
			'**/.*/**',

			// Hidden files (e.g. logs or temp files)
			'**/.*',

			// 3rd party packages
			'**/{node_modules,bower_components,vendor}/**',

			...options.exclude,
		],
		ignorePermissionErrors: true,
	};
	const handleWatchEvent = (
		source: 'include' | 'literal',
		event: string,
		filePath: string,
	) => {
		if (!watchersReady) {
			return;
		}

		const eventKey = getEventKey(event, filePath);
		const recentEvent = recentWatchEvents.get(eventKey);
		if (
			recentEvent
			&& recentEvent.source !== source
		) {
			clearTimeout(recentEvent.expiration);
			recentWatchEvents.delete(eventKey);
			return;
		}
		if (recentEvent) {
			clearTimeout(recentEvent.expiration);
		}
		const eventRecord = {
			source,
			expiration: setTimeout(() => {
				if (recentWatchEvents.get(eventKey) === eventRecord) {
					recentWatchEvents.delete(eventKey);
				}
			}, 1000),
		};
		eventRecord.expiration.unref();
		recentWatchEvents.set(eventKey, eventRecord);
		reRun(event, filePath);
	};
	literalWatcher = new FSWatcher({
		...watchOptions,
		disableGlobbing: true,
	});
	literalWatcher.on('all', (event, filePath) => {
		handleWatchEvent('literal', event, filePath);
	});
	const waitForReady = (watcher: FSWatcher) => new Promise<void>((resolve) => {
		watcher.once('ready', resolve);
	});
	const watcherReadyPromises = [waitForReady(literalWatcher)];
	literalWatcher.add(literalWatchPaths);
	if (options.include.some(includePattern => !includePattern.startsWith('!'))) {
		const includeWatcher = new FSWatcher(watchOptions);
		includeWatcher.on('all', (event, filePath) => {
			handleWatchEvent('include', event, filePath);
		});
		watcherReadyPromises.push(waitForReady(includeWatcher));
		includeWatcher.add(options.include);
	}

	await Promise.all(watcherReadyPromises);
	literalWatcher.add(options.include.filter(
		includePattern => includePattern.startsWith('!'),
	));
	watchersReady = true;
	runProcess = spawnProcess();

	// On "Return" key
	if (argv.flags.reloadOnKeypress && process.stdin.isTTY) {
		process.stdin.on('data', () => reRun('Return key'));
	}
});
