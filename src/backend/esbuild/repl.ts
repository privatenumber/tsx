export const createEsbuildReplTransform = (esbuild: typeof import('esbuild')) => async (code: string, filename: string): Promise<string> => esbuild.transform(
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
).then(result => result.code);
