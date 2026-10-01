import repl, { type REPLServer, type REPLEval } from 'node:repl';
import { transformSync, type TransformFailure } from 'esbuild';

// Like Node's REPL, a parse error at the end of the input means it is incomplete
// https://github.com/nodejs/node/blob/v24.15.0/lib/internal/repl/utils.js#L85-L86
const isErrorAtEndOfInput = (
	code: string,
	error: TransformFailure,
) => {
	// REPL input ends with a newline, so its end is the last line (as esbuild counts them)
	const lineCount = code.split(/\r\n|[\n\r\u2028\u2029]/).length;
	return error.errors?.some(({ location }) => location?.line === lineCount);
};

const patchEval = (nodeRepl: REPLServer) => {
	const { eval: defaultEval } = nodeRepl;
	const preEval: REPLEval = function (code, context, filename, callback) {
		try {
			const transformed = transformSync(
				code,
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
		} catch (error) {
			if (isErrorAtEndOfInput(code, error as TransformFailure)) {
				callback(new repl.Recoverable(error as Error), undefined);
				return;
			}
		}

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
