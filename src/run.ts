import type { StdioOptions } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import spawn from 'cross-spawn';
import { isFeatureSupported, moduleRegister } from './utils/node-features.js';

const loaderFlags = new Set([
	'--experimental-loader',
	'--loader',
]);

const splitLoaderFlags = (
	argv: string[],
) => {
	const loaderSpecifiers: string[] = [];
	const rest: string[] = [];

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index]!;

		if (argument === '--') {
			rest.push(...argv.slice(index));
			break;
		}

		if (loaderFlags.has(argument)) {
			const specifier = argv[index + 1];
			if (specifier) {
				loaderSpecifiers.push(specifier);
				index += 1;
			} else {
				rest.push(argument);
			}
			continue;
		}

		if (argument.startsWith('--loader=')) {
			loaderSpecifiers.push(argument.slice('--loader='.length));
			continue;
		}

		if (argument.startsWith('--experimental-loader=')) {
			loaderSpecifiers.push(argument.slice('--experimental-loader='.length));
			continue;
		}

		rest.push(argument);
	}

	return {
		loaderSpecifiers,
		rest,
	};
};

const loaderRegisterImport = (
	specifier: string,
) => {
	const registerSpecifier = path.isAbsolute(specifier)
		? pathToFileURL(specifier).toString()
		: specifier;

	return `data:text/javascript,${encodeURIComponent(`import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(${JSON.stringify(registerSpecifier)}, pathToFileURL('./'));
`)}`;
};

export const run = (
	argv: string[],
	options?: {
		noCache?: boolean;
		tsconfigPath?: string;
		ipc?: boolean;
	},
) => {
	const environment = { ...process.env };
	const stdio: StdioOptions = [
		'inherit', // stdin
		'inherit', // stdout
		'inherit', // stderr
	];

	// If parent process spawns tsx with ipc, spawn child with ipc
	if (process.send) {
		stdio.push('ipc');
	}

	if (options) {
		if (options.noCache) {
			environment.TSX_DISABLE_CACHE = '1';
		}

		if (options.tsconfigPath) {
			environment.TSX_TSCONFIG_PATH = options.tsconfigPath;
		}
	}

	const shouldPatchRepl = argv.filter(flag => (flag !== '-i' && flag !== '--interactive')).length === 0;
	const {
		loaderSpecifiers,
		rest,
	} = splitLoaderFlags(argv);
	const supportsModuleRegister = isFeatureSupported(moduleRegister);

	return spawn(
		process.execPath,
		[
			'--require',
			require.resolve('./preflight.cjs'),

			...(
				shouldPatchRepl
					? [
						'--require',
						require.resolve('./patch-repl.cjs'),
					]
					: []
			),

			supportsModuleRegister ? '--import' : '--loader',
			pathToFileURL(require.resolve('./loader.mjs')).toString(),

			...(
				supportsModuleRegister
					? [
						...loaderSpecifiers.flatMap(specifier => [
							'--import',
							loaderRegisterImport(specifier),
						]),
						...rest,
					]
					: argv
			),
		],
		{
			stdio,
			env: environment,
		},
	);
};
