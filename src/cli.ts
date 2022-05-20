import { cli } from 'cleye';
import { version } from '../package.json';
import { isBinaryPath, runBinary } from './run-binary';
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
}, async (argv) => {
	let binaryPath = process.execPath;
	let args = process.argv.slice(2);

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
		args.push(require.resolve('./repl'));
	}

	const [scriptPath] = argv._;
	const foundBinary = await isBinaryPath(scriptPath);

	if (foundBinary) {
		binaryPath = foundBinary;

		const scriptIndex = args.indexOf(scriptPath);
		if (scriptIndex > -1) {
			args.splice(scriptIndex, 1);
		}
	}

	if (argv.flags.noCache) {
		args = args.filter(
			argument => (argument !== '--no-cache' && argument !== '--noCache'),
		);
	}

	runBinary(
		binaryPath,
		args,
		{
			noCache: Boolean(argv.flags.noCache),
		},
	).on(
		'close',
		code => process.exit(code!),
	);
});
