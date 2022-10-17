import { setTimeout } from 'timers/promises';
import { cli } from 'cleye';
import typeFlag from 'type-flag';
import { version } from '../package.json';
import { run } from './run';
import { watchCommand } from './watch';

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

const flags = {
	...tsxFlags,
	version: {
		type: Boolean,
		description: 'Show version',
	},
	help: {
		type: Boolean,
		alias: 'h',
		description: 'Show help',
	},
};

cli({
	name: 'tsx',
	parameters: ['[script path]'],
	commands: [
		watchCommand,
	],
	flags,
	help: false,
}, (argv) => {
	const noArgs = argv._.length === 0;

	if (noArgs) {
		if (argv.flags.version) {
			console.log(version);
			return;
		}

		if (argv.flags.help) {
			argv.showHelp({
				description: 'Node.js runtime enhanced with esbuild for loading TypeScript & ESM',
			});
			return;
		}

		// Load REPL
		process.argv.push(require.resolve('./repl'));
	}

	const args = typeFlag(
		noArgs ? flags : tsxFlags,
		process.argv.slice(2),
		{ ignoreUnknown: true },
	)._;

	const childProcess = run(args, {
		noCache: Boolean(argv.flags.noCache),
		tsconfigPath: argv.flags.tsconfig,
	});

	const relaySignal = async (signal: NodeJS.Signals) => {
		const message = await Promise.race([
			/**
			 * If child received a signal, it detected a keypress or
			 * was sent a signal via process group.
			 *
			 * Ignore it and let child handle it.
			 */
			new Promise<NodeJS.Signals>((resolve) => {
				function onKillSignal(data: { type: string; signal: NodeJS.Signals }) {
					if (data && data.type === 'kill') {
						resolve(data.signal);
						childProcess.off('message', onKillSignal);
					}
				}

				childProcess.on('message', onKillSignal);
			}),
			setTimeout(10),
		]);

		/**
		 * If child didn't receive a signal, it was sent to the parent
		 * directly via kill PID. Relay it to child.
		 */
		if (!message) {
			childProcess.kill(signal);
		}
	};

	process.on('SIGINT', relaySignal);
	process.on('SIGTERM', relaySignal);

	childProcess.on(
		'close',
		code => process.exit(code!),
	);
});
