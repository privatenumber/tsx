import repl, { type REPLEval } from 'repl';
import { transform } from '@esbuild-kit/core-utils';
import { version } from '../package.json';

// Copied from
// https://github.com/nodejs/node/blob/v18.2.0/lib/internal/main/repl.js#L37
console.log(
	`Welcome to tsx v${version} (Node.js ${process.version}).\n`
      + 'Type ".help" for more information.',
);

const nodeRepl = repl.start();

const { eval: defaultEval } = nodeRepl;

const preEval: REPLEval = async function (code, context, filename, callback) {
	const transformed = await transform(code, '.ts');
	return defaultEval.call(this, transformed.code, context, filename, callback);
};

// @ts-expect-error overriding read-only property
nodeRepl.eval = preEval;
