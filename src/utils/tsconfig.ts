import {
	createFilesMatcher,
	createPathsMatcher,
	getTsconfig,
	parseTsconfig,
	type FileMatcher,
	type TsConfigResult,
} from "get-tsconfig";
import path from "node:path";

// eslint-disable-next-line import-x/no-mutable-exports
export let fileMatcher: undefined | FileMatcher;

// eslint-disable-next-line import-x/no-mutable-exports
export let tsconfigPathsMatcher:
	| undefined
	| ReturnType<typeof createPathsMatcher>;

// eslint-disable-next-line import-x/no-mutable-exports
export let allowJs = false;

export const loadTsconfig = (configPath?: string) => {
	let tsconfig: TsConfigResult | null = null;
	if (configPath) {
		const resolvedConfigPath = path.resolve(configPath);
		try {
			tsconfig = {
				path: resolvedConfigPath,
				config: parseTsconfig(resolvedConfigPath),
			};
		} catch (error) {
			// the error from parseTsConfig contains a user friendly stack trace... but its not
			// very actionable and contains a big chunk of raw minified source above it so we re-throw
			// a new error with a more actionable message instead.
			throw new Error(
				`Failed to load tsconfig from path "${resolvedConfigPath}". Please ensure the file exists and is a valid tsconfig.json.`,
			);
		}
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
