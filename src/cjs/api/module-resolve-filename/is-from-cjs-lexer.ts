const cjsPreparseFunctionName = 'cjsPreparseModuleExports';
const cjsPreparseCall = `at ${cjsPreparseFunctionName} (node:internal`;

const isCjsPreparseCallSite = (callSite?: NodeJS.CallSite) => (
	callSite?.getFunctionName() === cjsPreparseFunctionName
	&& callSite.getFileName()?.startsWith('node:internal')
);

const returnCallSites = (
	_error: Error,
	callSites: NodeJS.CallSite[],
) => callSites;

/**
 * Formatting error.stack runs Error.prepareStackTrace, which source-maps every
 * frame when source maps are enabled, so read structured call sites instead.
 *
 * Frame 0 is the caller of this function.
 */
export const isFromCjsLexer = () => {
	const { prepareStackTrace, stackTraceLimit } = Error;

	// Error is read-only under --frozen-intrinsics
	try {
		Error.prepareStackTrace = returnCallSites;
		Error.stackTraceLimit = 3;
	} catch {}

	const holder: { stack?: string | NodeJS.CallSite[] } = {};
	Error.captureStackTrace(holder, isFromCjsLexer);

	// Formatting is lazy, so read the stack before restoring
	const { stack } = holder;

	try {
		Error.prepareStackTrace = prepareStackTrace;
		Error.stackTraceLimit = stackTraceLimit;
	} catch {}

	if (Array.isArray(stack)) {
		return isCjsPreparseCallSite(stack[1]) || isCjsPreparseCallSite(stack[2]);
	}

	const frames = String(stack).split('\n').slice(1);
	return frames[1]?.includes(cjsPreparseCall) || frames[2]?.includes(cjsPreparseCall);
};
