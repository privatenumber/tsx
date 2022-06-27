import { cli } from 'cleye';
import { version } from '../package.json';
import { run } from './run';
import { watchCommand } from './watch';

cli({
	name: 'tsx',
	parameters: ['[script path]'],
	commands: [
		watchCommand,
	],
	flags: {
		noCache: {
			type: Boolean,
			description: 'Disable caching',
		},
		tsconfig: {
			type: String,
			description: 'Custom tsconfig.json name',
		},
		version: {
			type: Boolean,
			description: 'Show version',
		},
		help: {
			type: Boolean,
			alias: 'h',
			description: 'Show help',
		},
	},
	help: false,
}, (argv) => {
	if (argv._.length === 0) {
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

	const args = process.argv.slice(2).filter(
		(argument, i, array) => (argument !== '--no-cache'
		&& argument !== '--noCache'
		&& argument !== '--tsconfig'
		&& !(i > 0 && array[i - 1] === '--tsconfig')
		&& !argument.startsWith('--tsconfig=')),
	);

	run(args, {
		noCache: Boolean(argv.flags.noCache),
		tsconfig: argv.flags.tsconfig,
	}).on(
		'close',
		code => process.exit(code!),
	);
});
