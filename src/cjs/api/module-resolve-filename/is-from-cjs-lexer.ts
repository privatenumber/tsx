const cjsPreparseCall = 'at cjsPreparseModuleExports (node:internal';

export const isFromCjsLexer = (
	error: Error,
) => {
	const stack = error.stack!.split('\n').slice(1);
	return (
		stack[1].includes(cjsPreparseCall)
		|| stack[2].includes(cjsPreparseCall)
	);
};
