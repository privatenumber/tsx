import { cli } from 'cleye';
import { version } from '../package.json';
import { run } from './run';
import { watchCommand } from './watch';
import {
	removeArgvFlags,
	ignoreAfterArgument,
} from './remove-argv-flag';

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
}, (argv) => {
	if (argv.flags.version) {
		process.stdout.write(`tsx v${version}\nnode `);
	} else if (argv.flags.help) {
		argv.showHelp({
			description: 'Node.js runtime enhanced with esbuild for loading TypeScript & ESM',
		});
		console.log(`${'-'.repeat(45)}\n`);
	}

	const childProcess = run(
		removeArgvFlags(tsxFlags),
		{
			noCache: Boolean(argv.flags.noCache),
			tsconfigPath: argv.flags.tsconfig,
		},
	);

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
			new Promise((resolve) => {
				setTimeout(resolve, 10);
			}),
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
