import { cli } from 'cleye';
import { version } from '../package.json';
import { run } from './run';
import { watchCommand } from './watch';

cli({
	name: 'tsx',
	version,
	parameters: ['[script path]'],
	commands: [
		watchCommand,
	],
	flags: {
		noCache: {
			type: Boolean,
			description: 'Disable caching',
		},
	},
	help: {
		description: 'Node.js runtime enhanced with esbuild for loading TypeScript & ESM',
	},
}, (argv) => {
	run(argv._, {
		noCache: Boolean(argv.flags.noCache),
	}).on(
		'close',
		code => process.exit(code!),
	);
});
