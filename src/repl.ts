import repl, { type REPLEval } from 'repl';
import { transform } from '@esbuild-kit/core-utils';

const nodeRepl = repl.start();

const { eval: defaultEval } = nodeRepl;

const preEval: REPLEval = async function (code, context, filename, callback) {
	const transformed = await transform(code, '.ts');
	return defaultEval.call(this, transformed.code, context, filename, callback);
};

// @ts-expect-error overriding read-only property
nodeRepl.eval = preEval;
