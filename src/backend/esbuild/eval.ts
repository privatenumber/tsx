export const createEsbuildEvalTransformSync = (esbuild: typeof import('esbuild')) => {
	return function evalTransformSync(evalCode: string, inputType?: string) {
		return esbuild.transformSync(
			evalCode,
			{
				loader: 'default',
				sourcefile: '/eval.ts',
				format: inputType === 'module' ? 'esm' : 'cjs',
			},
		).code
	}
}
