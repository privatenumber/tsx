import type { ChildProcess } from 'child_process';
import type { Server } from 'net';
import { cli } from 'cleye';
import {
	transformSync as esbuildTransformSync,
} from 'esbuild';
import { version } from '../package.json';
import { run } from './run.js';
import { watchCommand } from './watch/index.js';
import {
	removeArgvFlags,
	ignoreAfterArgument,
} from './remove-argv-flags.js';
import { testRunnerGlob } from './utils/node-features.js';
import { createIpcServer } from './utils/ipc/server.js';

const relaySignals = (
	childProcess: ChildProcess,
	ipcSocket: Server,
) => {
	let waitForSignal: undefined | ((signal: NodeJS.Signals) => void);

	ipcSocket.on('data', (data: { type: string; signal: NodeJS.Signals }) => {
		if (
			data
			&& data.type === 'kill'
			&& waitForSignal
		) {
			waitForSignal(data.signal);
		}
	});

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

		/**
		 * If child didn't receive a signal, it's either because it was
		 * sent to the parent directly via kill PID or the child is
		 * unresponsive (e.g. infinite loop). Relay signal to child.
		 */
		if (signalFromChild !== signal) {
			childProcess.kill(signal);

			/**
			 * If child is unresponsive (e.g. infinite loop), we need to force kill it
			 */
			const isChildResponsive = await waitForSignalFromChild();
			if (isChildResponsive !== signal) {
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
		const transformed = esbuildTransformSync(
			evalCode,
			{
				loader: 'default',
				sourcefile: '/eval.ts',
				format: inputType === 'module' ? 'esm' : 'cjs',
			},
		);

		argvsToRun.unshift(`--${evalType}`, transformed.code);
	}

	// Default --test glob to find TypeScript files
	if (
		testRunnerGlob
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

	childProcess.on(
		'close',
		(code) => {
			// ipc.close();
			process.exit(code!);
		},
	);
});
