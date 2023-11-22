import repl, { type REPLServer, type REPLEval } from 'repl';
import { transform } from 'esbuild';

function patchEval(nodeRepl: REPLServer) {
	const { eval: defaultEval } = nodeRepl;
	const preEval: REPLEval = async function (code, context, filename, callback) {
		try {
			const transformed = await transform(
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
		} catch {}

		return defaultEval.call(this, code, context, filename, callback);
	};

	// @ts-expect-error overwriting read-only property
	nodeRepl.eval = preEval;
}

const { start } = repl;
repl.start = function () {
	const nodeRepl = Reflect.apply(start, this, arguments);
	patchEval(nodeRepl);
	return nodeRepl;
};
