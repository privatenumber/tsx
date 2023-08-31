import { cli } from 'cleye';
import { version } from '../package.json';
import { run } from './run';
import { watchCommand } from './watch';
import { removeArgvFlags, ignoreAfterArgument } from './remove-argv-flags';
import {
	getErrorCode,
	handleSignal,
	installClientSignalAckHandler,
} from './signals';

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
			// eslint-disable-next-line no-console
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

		installClientSignalAckHandler(childProcess);

		const errorListener = (error: Error) => {
			// eslint-disable-next-line no-console
			console.error(error);
			process.exitCode = getErrorCode(childProcess, 1);
			cleanup();
		};
		const exitListener = (code: number | null) => {
			process.exitCode = getErrorCode(childProcess, code === null ? 0 : code);
			cleanup();
		};
		const cleanup = () => {
			sigint.uninstall();
			sigterm.uninstall();
			process.off('error', errorListener);
			process.off('exit', exitListener);
		};
		childProcess.on('error', errorListener);
		childProcess.on('exit', exitListener);
	},
);
