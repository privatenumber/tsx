import { cli } from 'cleye';
import { version } from '../package.json';
import { run } from './run';
import { watchCommand } from './watch';

cli({
	name: 'esb',
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
		description: 'esbuild-kit: enhance Node.js with esbuild',
	},
}, (argv) => {
	run(argv._, {
		noCache: Boolean(argv.flags.noCache),
	}).on(
		'close',
		code => process.exit(code!),
	);
});
