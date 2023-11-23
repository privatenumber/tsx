// Deprecated: Delete entry-point in next major in favor of patch-repl.ts

import repl, { type REPLEval } from 'repl';
import { version } from '../package.json';
import { transform } from './utils/transform/index.js';

// Copied from
// https://github.com/nodejs/node/blob/v18.2.0/lib/internal/main/repl.js#L37
console.log(
	`Welcome to tsx v${version} (Node.js ${process.version}).\n`
      + 'Type ".help" for more information.',
);

const nodeRepl = repl.start();

const { eval: defaultEval } = nodeRepl;

const preEval: REPLEval = async function (code, context, filename, callback) {
	const transformed = await transform(
		code,
		filename,
		{
			loader: 'ts',
			tsconfigRaw: {
				compilerOptions: {
					preserveValueImports: true,
				},
			},
			define: {
				require: 'global.require',
			},
		},
	).catch(
		(error) => {
			console.log(error.message);
			return { code: '\n' };
		},
	);

	return defaultEval.call(this, transformed.code, context, filename, callback);
};

// @ts-expect-error overriding read-only property
nodeRepl.eval = preEval;
