import type { TsconfigResult } from 'get-tsconfig';

export const loadTsconfig = (
	configPath?: string,
): TsconfigResult | undefined => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { getTsconfig, readTsconfig } = require('get-tsconfig') as typeof import('get-tsconfig');
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
