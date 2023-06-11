import { constants as osConstants } from 'os';
import { cli } from 'cleye';
import { version } from '../package.json';
import { run } from './run';
import { watchCommand } from './watch';
import { removeArgvFlags, ignoreAfterArgument } from './remove-argv-flags';
import { ChildProcess, type Serializable } from 'child_process';

type SignalMessage = Serializable & {
	type: 'signal';
	signal: NodeJS.Signals;
};

// The interval between checks to see if child has acknowledged a signal.
// Practically speaking, this is the minimum amount to wait before a signal
// that is sent only to parent will be relayed to child.
const POLL_INTERVAL_MS = 100;
// The maximum time to wait to see if child has acknowledged a signal.
// Practically speaking, if the client is in a tight synchronous loop, or
// has been stopped in a debugger, then they'll likely get multiple notifications.
const POLL_MAX_TIME_MS = 1000;

const clientAckTimestamps: { [index: string]: number } = {
	SIGINT: 0,
	SIGTERM: 0,
};

let lastSignal: NodeJS.Signals | null = null;

const handleSignal = (signal: NodeJS.Signals, childProcess: ChildProcess) => {
	let pending = 0;
	let timeout: NodeJS.Timeout | null = null;
	const handle = () => {
		pending++;
		lastSignal = signal;
		const signalTime = Date.now();
		const maxTime = signalTime + POLL_MAX_TIME_MS;
		if (timeout != null) clearTimeout(timeout);
		const notify = () => {
			const clientAckDelta = (clientAckTimestamps[signal] || 0) - signalTime;
			if (Math.abs(clientAckDelta) < POLL_MAX_TIME_MS) {
				// do not notify - client has handled it
			} else if (Date.now() > maxTime) {
				// timeout - if we're still spinning, then we need to notify client
				while (pending > 0) {
					childProcess.kill(signal);
					pending--;
				}
			} else {
				timeout = setTimeout(notify, POLL_INTERVAL_MS);
			}
		};
		// no need to wait the very first time
		timeout = setTimeout(notify, 0);
	};
	handle.install = () => process.on(signal, handle);
	handle.uninstall = () => timeout && clearTimeout(timeout);

	return handle;
};

const getErrorCode = (
	childProcess: ChildProcess,
	defaultCode: number,
): number => {
	if (childProcess.exitCode !== null) {
		return childProcess.exitCode;
	}
	if (lastSignal !== null) {
		return 128 + osConstants.signals[lastSignal];
	}
	return defaultCode;
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

cli(
	{
		name: 'tsx',
		parameters: ['[script path]'],
		commands: [watchCommand],
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
	},
	(argv) => {
		if (argv.flags.version) {
			process.stdout.write(`tsx v${version}\nnode `);
		} else if (argv.flags.help) {
			argv.showHelp({
				description:
					'Node.js runtime enhanced with esbuild for loading TypeScript & ESM',
			});
			console.log(`${'-'.repeat(45)}\n`);
		}

		const childProcess = run(removeArgvFlags(tsxFlags), {
			noCache: Boolean(argv.flags.noCache),
			tsconfigPath: argv.flags.tsconfig,
		});

		const sigint = handleSignal('SIGINT', childProcess);
		const sigterm = handleSignal('SIGTERM', childProcess);

		sigint.install();
		sigterm.install();

		childProcess.on('message', (message: SignalMessage) => {
			const { type } = message;
			if (type === 'signal') clientAckTimestamps[message.signal] = Date.now();
		});
		childProcess.on('error', (error) => {
			console.error(error);
			process.exitCode = getErrorCode(childProcess, 1);
			sigint.uninstall();
			sigterm.uninstall();
		});
		childProcess.on('exit', (error) => {
			process.exitCode = getErrorCode(childProcess, error === null ? 0 : error);
			sigint.uninstall();
			sigterm.uninstall();
		});
	},
);
