import { constants as osConstants } from 'node:os';
import type { ChildProcess, Serializable } from 'node:child_process';
import type { Server } from 'node:net';
import { cli } from 'cleye';
import { version } from '../package.json';
import { run } from './run.js';
import { watchCommand } from './watch/index.js';
import {
	removeArgvFlags,
	ignoreAfterArgument,
} from './remove-argv-flags.js';
import { isFeatureSupported, testRunnerGlob } from './utils/node-features.js';
import { createIpcServer } from './utils/ipc/server.js';
import backend from './backend';

// const debug = (...messages: any[]) => {
// 	if (process.env.DEBUG) {
// 		console.log(...messages);
// 	}
// };

const relaySignals = (
	childProcess: ChildProcess,
	ipcSocket: Server,
) => {
	let waitForSignal: undefined | ((signal: NodeJS.Signals) => void);

	ipcSocket.on(
		'data',
		(
			data: {
				type: string;
				signal: NodeJS.Signals;
			},
		) => {
			if (
				data
				&& data.type === 'signal'
				&& waitForSignal
			) {
				waitForSignal(data.signal);
			}
		},
	);

	/**
	 * Wait for signal from preflight bindHiddenSignalsHandler
	 * Ideally the timeout should be as low as possible
	 * since the child lets the parent know that it received
	 * the signal
	 */
	const waitForSignalFromChild = () => {
		const p = new Promise<NodeJS.Signals | undefined>((resolve) => {
			// Aribrary timeout based on flaky tests
			setTimeout(() => resolve(undefined), 30);
			waitForSignal = resolve;
		});

		p.then(
			() => {
				waitForSignal = undefined;
			},
			() => {},
		);

		return p;
	};

	const relaySignalToChild = async (
		signal: NodeJS.Signals,
	) => {
		/**
		 * This callback is triggered if the parent receives a signal
		 *
		 * Child could also receive a signal at the same time if it detected
		 * a keypress or was sent a signal via process group
		 *
		 * The preflight registers a signal handler on the child to
		 * tell the parent if it also received a signal which we wait for here
		 */
		const signalFromChild = await waitForSignalFromChild();

		// debug({
		// 	signalFromChild,
		// });

		/**
		 * If child didn't receive a signal, it's either because it was
		 * sent to the parent directly via kill PID or the child is
		 * unresponsive (e.g. infinite loop). Relay signal to child.
		 */
		if (signalFromChild !== signal) {
			// debug('killing child', {
			// 	signal,
			// });
			childProcess.kill(signal);

			/**
			 * If child is unresponsive (e.g. infinite loop), we need to force kill it
			 */
			const isChildResponsive = await waitForSignalFromChild();
			if (isChildResponsive !== signal) {
				// This seems to run before the handler registered at the bottom of this file
				// Seems the lastest handler is called first
				childProcess.on('exit', () => {
					/**
					 * Even though this may not be a SIGKILL, I've confirmed Ctrl+C on an infinite looping
					 * file exits with 130, which is 128 + 2 (SIGINT)
					 *
					 * https://nodejs.org/api/process.html#exit-codes
					 * >128 Signal Exits: If Node.js receives a fatal signal such as SIGKILL or SIGHUP,
					 * then its exit code will be 128 plus the value of the signal code. This is a
					 * standard POSIX practice, since exit codes are defined to be 7-bit integers, and
					 * signal exits set the high-order bit, and then contain the value of the signal code.
					 * For example, signal SIGABRT has value 6, so the expected exit code will be 128 + 6,
					 * or 134.
					 */
					const exitCode = osConstants.signals[signal];
					process.exit(128 + exitCode);
				});

				childProcess.kill('SIGKILL');
			}
		}
	};

	process.on('SIGINT', relaySignalToChild);
	process.on('SIGTERM', relaySignalToChild);
};

const tsxFlags = {
	noCache: {
		type: Boolean,
		description: 'Disable caching',
	},
	tsconfig: {
		type: String,
		description: 'Custom tsconfig.json path',
	},
};

cli({
	name: 'tsx',
	parameters: ['[script path]'],
	commands: [
		watchCommand,
	],
	flags: {
		...tsxFlags,
		version: {
			type: Boolean,
			alias: 'v',
			description: 'Show version',
		},
		help: {
			type: Boolean,
			alias: 'h',
			description: 'Show help',
		},
	},
	help: false,
	ignoreArgv: ignoreAfterArgument(),
}, async (argv) => {
	if (argv.flags.version) {
		process.stdout.write(`tsx v${version}\nnode `);
	} else if (argv.flags.help) {
		argv.showHelp({
			description: 'Node.js runtime enhanced with esbuild for loading TypeScript & ESM',
		});
		console.log(`${'-'.repeat(45)}\n`);
	}

	const interceptFlags = {
		eval: {
			type: String,
			alias: 'e',
		},
		print: {
			type: String,
			alias: 'p',
		},
	} as const;

	const {
		_: firstArgs,
		flags: interceptedFlags,
	} = cli({
		flags: {
			...interceptFlags,
			inputType: String,
			test: Boolean,
		},
		help: false,
		ignoreArgv: ignoreAfterArgument(false),
	});

	const argvsToRun = removeArgvFlags({
		...tsxFlags,
		...interceptFlags,
	});

	const evalTypes = ['print', 'eval'] as const;
	const evalType = evalTypes.find(type => Boolean(interceptedFlags[type]));
	if (evalType) {
		const { inputType } = interceptedFlags;
		const evalCode = interceptedFlags[evalType]!;
		const transformed = backend.evalTransformSync(
			evalCode,
			inputType,
		);

		argvsToRun.unshift(`--${evalType}`, transformed);
	}

	// Default --test glob to find TypeScript files
	if (
		isFeatureSupported(testRunnerGlob)
		&& interceptedFlags.test
		&& firstArgs.length === 0
	) {
		argvsToRun.push('**/{test,test/**/*,test-*,*[.-_]test}.?(c|m)@(t|j)s');
	}

	const ipc = await createIpcServer();

	const childProcess = run(
		argvsToRun,
		{
			noCache: Boolean(argv.flags.noCache),
			tsconfigPath: argv.flags.tsconfig,
		},
	);

	relaySignals(childProcess, ipc);

	if (process.send) {
		childProcess.on('message', (message) => {
			process.send!(message);
		});
	}

	if (childProcess.send) {
		process.on('message', (message) => {
			childProcess.send(message as Serializable);
		});
	}

	childProcess.on(
		'close',
		(exitCode) => {
			// If there's no exit code, it's likely killed by a signal
			// https://nodejs.org/api/process.html#process_exit_codes
			if (exitCode === null) {
				exitCode = osConstants.signals[childProcess.signalCode!] + 128;
			}
			process.exit(exitCode);
		},
	);
});
