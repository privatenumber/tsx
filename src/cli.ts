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
		argument => (argument !== '--no-cache' && argument !== '--noCache'),
	);

	run(args, {
		noCache: Boolean(argv.flags.noCache),
	}).on(
		'close',
		code => process.exit(code!),
	);
});
