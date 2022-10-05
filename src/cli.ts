import { cli } from 'cleye';
import typeFlag from 'type-flag';
import { version } from '../package.json';
import { run } from './run';
import { watchCommand } from './watch';
import { findTestFiles } from './test-runner/util';

const tsxFlags = {
	noCache: {
		type: Boolean,
		description: 'Disable caching',
	},
	tsconfig: {
		type: String,
		description: 'Custom tsconfig.json path',
	},
	test: {
		type: Boolean,
		description: 'Run node testrunner',
		default: false,
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
		if (!argv.flags.test) {
			process.argv.push(require.resolve('./repl'));
		}
	}

	const args = typeFlag(
		noArgs ? flags : tsxFlags,
		process.argv.slice(2),
		{ ignoreUnknown: true },
	)._;

	if (argv.flags.test) {
		if (noArgs) {
			args.push('--test', ...findTestFiles());
		} else {
			args.unshift('--test');
		}
	}

	run(args, {
		noCache: Boolean(argv.flags.noCache),
		tsconfigPath: argv.flags.tsconfig,
	}).on(
		'close',
		code => process.exit(code!),
	);
});
