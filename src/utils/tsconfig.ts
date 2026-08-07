import { getTsconfig, readTsconfig, type TsconfigResult } from 'get-tsconfig';

export const loadTsconfig = (
	configPath?: string,
): TsconfigResult | undefined => {
	if (configPath) {
		return readTsconfig(configPath);
	}

	try {
		return getTsconfig() ?? undefined;
	} catch {
		// Not warning here for now because it gets warned twice
		// Once by ESM loader and then by CJS loader
	}
};
