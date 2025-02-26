export const createEsbuildEvalTransformSync = (esbuild: typeof import('esbuild')) => (evalCode: string, inputType?: string) => esbuild.transformSync(
	evalCode,
	{
		loader: 'default',
		sourcefile: '/eval.ts',
		format: inputType === 'module' ? 'esm' : 'cjs',
	},
).code;
