import repl, { type REPLServer, type REPLEval } from 'node:repl';
import backend from './backend';

const patchEval = (nodeRepl: REPLServer) => {
	const { eval: defaultEval } = nodeRepl;
	const preEval: REPLEval = async function (code, context, filename, callback) {
		try {
			code = await backend.replTransform(code, filename);
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
