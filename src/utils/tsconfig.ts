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
		tsconfig = getTsconfig();
		if (!tsconfig) {
			return;
		}
	}

	fileMatcher = createFilesMatcher(tsconfig);
	tsconfigPathsMatcher = createPathsMatcher(tsconfig);
	allowJs = tsconfig?.config.compilerOptions?.allowJs ?? false;
};
