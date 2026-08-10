import fs from 'node:fs';
import path from 'node:path';
import { getTsconfig, readTsconfig, type TsconfigResult } from 'get-tsconfig';

export const loadTsconfig = (
	configPath?: string,
): TsconfigResult | undefined => {
	if (configPath) {
		const resolvedConfigPath = path.resolve(configPath);
		if (!fs.existsSync(resolvedConfigPath)) {
			throw new Error(`Cannot find tsconfig at path: ${resolvedConfigPath}`);
		}

		try {
			return readTsconfig(resolvedConfigPath);
		} catch (error) {
			throw new Error(`Failed to read tsconfig at: ${resolvedConfigPath}\n${(error as Error).message}`);
		}
	}

	try {
		return getTsconfig() ?? undefined;
	} catch {
		// Not warning here for now because it gets warned twice
		// Once by ESM loader and then by CJS loader
	}
};
