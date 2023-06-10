import { cli } from 'cleye';
import { version } from '../package.json';
import { run } from './run';
import { watchCommand } from './watch';
import {
	removeArgvFlags,
	ignoreAfterArgument,
} from './remove-argv-flags';

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

	
	let lastSignal: number;
	const createRelay = (code: number) => async (signal: NodeJS.Signals) => {
		lastSignal = code;
		childProcess.kill(signal);
	};
	const signalToRelay = {
		SIGINT: createRelay(2),
		SIGTERM: createRelay(15),
	};
	for (const [signal, relay] of Object.entries(signalToRelay)) {
		process.on(signal, relay);
	}

	childProcess.on("error", (error) => {
		if (error) {
			console.error(error);
		}
		process.exitCode =
			childProcess.exitCode === null
				? (128 + lastSignal) || 1
				: childProcess.exitCode;
		for (const [signal, relay] of Object.entries(signalToRelay)) {
			process.off(signal, relay);
		}
	});
	childProcess.on("exit", async (error) => {
		process.exitCode =
			error === null
				? childProcess.exitCode === null
					? (128 + lastSignal) || 0
					: childProcess.exitCode
				: error;
		for (const [signal, relay] of Object.entries(signalToRelay)) {
			process.off(signal, relay);
		}
	}); 
	
});
