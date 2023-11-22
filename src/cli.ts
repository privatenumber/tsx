import { cli } from 'cleye';
import {
	transformSync as esbuildTransformSync,
} from 'esbuild';
import { version } from '../package.json';
import { run } from './run.js';
import { watchCommand } from './watch/index.js';
import {
	removeArgvFlags,
	ignoreAfterArgument,
} from './remove-argv-flags.js';

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

	const interceptFlags = {
		eval: {
			type: String,
			alias: 'e',
		},
		print: {
			type: String,
			alias: 'p',
		},
	};

	const { flags: interceptedFlags } = cli({
		flags: {
			...interceptFlags,
			inputType: String,
		},
		help: false,
		ignoreArgv: ignoreAfterArgument(),
	});

	const argvsToRun = removeArgvFlags({
		...tsxFlags,
		...interceptFlags,
	});

	const evalTypes = ['print', 'eval'] as const;
	const evalType = evalTypes.find(type => Boolean(interceptedFlags[type]));
	if (evalType) {
		const { inputType } = interceptedFlags;
		const evalCode = interceptedFlags[evalType]!;
		const transformed = esbuildTransformSync(
			evalCode,
			{
				loader: 'default',
				sourcefile: '/eval.ts',
				format: inputType === 'module' ? 'esm' : 'cjs',
			},
		);

		argvsToRun.push(`--${evalType}`, transformed.code);
	}

	const childProcess = run(
		argvsToRun,
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
