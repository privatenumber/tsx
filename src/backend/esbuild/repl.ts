export const createEsbuildReplTransform = (esbuild: typeof import('esbuild')) => {
	return async function replTransform (code: string, filename: string): Promise<string> {
		return (await esbuild.transform(
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
		)).code
	}
}
