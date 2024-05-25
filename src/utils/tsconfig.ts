import path from 'node:path';
import {
	getTsconfig,
	parseTsconfig,
	createFilesMatcher,
	createPathsMatcher,
	type TsConfigResult,
	type FileMatcher,
} from 'get-tsconfig';

// eslint-disable-next-line import-x/no-mutable-exports
export let fileMatcher: undefined | FileMatcher;

// eslint-disable-next-line import-x/no-mutable-exports
export let tsconfigPathsMatcher: undefined | ReturnType<typeof createPathsMatcher>;

// eslint-disable-next-line import-x/no-mutable-exports
export let allowJs = false;

export const loadTsconfig = (
	configPath?: string,
) => {
	let tsconfig: TsConfigResult | null = null;
	if (configPath) {
		const resolvedConfigPath = path.resolve(configPath);
		tsconfig = {
			path: resolvedConfigPath,
			config: parseTsconfig(resolvedConfigPath),
		};
	} else {
		try {
			tsconfig = getTsconfig();
		} catch {
			// Not warning here for now because it gets warned twice
			// Once by ESM loader and then by CJS loader
			// const disableWarning = (
			// 	getFlag('--no-warnings', Boolean)
			// 	|| Boolean(process.env.NODE_NO_WARNINGS)
			// );
			// if (!disableWarning) {
			// 	if (error instanceof Error) {
			// 		console.warn(`(tsx:${process.pid}) [-----] TsconfigWarning:`, error.message);
			// 	}
			// }
		}

		if (!tsconfig) {
			return;
		}
	}

	fileMatcher = createFilesMatcher(tsconfig);
	tsconfigPathsMatcher = createPathsMatcher(tsconfig);
	allowJs = tsconfig?.config.compilerOptions?.allowJs ?? false;
};
