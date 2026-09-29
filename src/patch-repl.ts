import repl, { type REPLServer, type REPLEval } from 'node:repl';
import { transform } from 'esbuild';

const patchEval = (nodeRepl: REPLServer) => {
	const { eval: defaultEval } = nodeRepl;
	const preEval: REPLEval = async function (code, context, filename, callback) {
		try {
			// esbuild parses REPL input as a script, so sloppy-only syntax such as
			// octal literals is rewritten (01 → 1) unless the source is strict.
			// Node's strict REPL (NODE_REPL_MODE=strict) does not insert a
			// directive into this string, so add one before transforming.
			const transformed = await transform(
				nodeRepl.replMode === repl.REPL_MODE_STRICT
					? `'use strict';${code}`
					: code,
				{
					sourcefile: filename,
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
			);

			code = transformed.code;
		} catch {}

		return defaultEval.call(this, code, context, filename, callback);
	};

	// @ts-expect-error overwriting read-only property
	nodeRepl.eval = preEval;
};

const { start } = repl;
repl.start = function () {
	const nodeRepl = Reflect.apply(start, this, arguments);
	patchEval(nodeRepl);
	return nodeRepl;
};
