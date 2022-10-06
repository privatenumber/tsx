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

	const { _: args, flags: parsedFlags, unknownFlags } = typeFlag(
		noArgs ? flags : tsxFlags,
		process.argv.slice(2),
		{ ignoreUnknown: !noArgs },
	);

	const noKnownFlags = Object.values(parsedFlags).every(fl => fl === undefined);
	const noUnknownFlags = Object.keys(unknownFlags).length === 0;

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
		if (noUnknownFlags && noKnownFlags) {
			args.push(require.resolve('./repl'));
		}
	}

	// serialize unknown flags and add to args as they are most likely supposed to be passed to node
	if (noKnownFlags && !noUnknownFlags) {
		Object.keys(unknownFlags).reverse().forEach((unknownFlag) => {
			unknownFlags[unknownFlag].forEach((unknownFlagValue) => {
				if (typeof unknownFlagValue === 'string') {
					args.unshift(`--${unknownFlag}`, unknownFlagValue);
				} else {
					args.unshift(`--${unknownFlag}`);
				}
			});
		});
	}

	run(args, {
		noCache: Boolean(argv.flags.noCache),
		tsconfigPath: argv.flags.tsconfig,
	}).on(
		'close',
		code => process.exit(code!),
	);
});
