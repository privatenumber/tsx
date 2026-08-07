import fs from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';

export type TsxImplementation = {
	name: string;
	cliPath: string;
};

// undefined when the path doesn't exist (ENOENT)
const statSafe = (
	checkPath: string,
) => fs.stat(checkPath).catch(() => undefined);

/**
 * Resolves a comparison target to a tsx CLI entry point.
 * Accepts a path (to a cli.mjs or a tsx package directory)
 * or an npm version specifier (e.g. `4.21.0`, `latest`),
 * which gets installed into a subdirectory of installRootPath
 * (a temporary directory disposed of by the caller)
 */
export const resolveTsx = async (
	specifier: string,
	installRootPath: string,
): Promise<TsxImplementation> => {
	const stats = await statSafe(specifier);
	if (stats) {
		if (stats.isFile()) {
			return {
				name: specifier,
				cliPath: path.resolve(specifier),
			};
		}

		const cliPath = path.resolve(specifier, 'dist/cli.mjs');
		if (await statSafe(cliPath)) {
			return {
				name: specifier,
				cliPath,
			};
		}

		throw new Error(`Could not find dist/cli.mjs in ${specifier}`);
	}

	// npm version specifier
	const installDirectory = path.join(installRootPath, specifier.replaceAll(/[^\w.-]/g, '-'));
	await fs.mkdir(installDirectory, { recursive: true });
	await fs.writeFile(
		path.join(installDirectory, 'package.json'),
		JSON.stringify({
			name: 'tsx-benchmark',
			private: true,
		}),
	);

	process.stderr.write(`Installing tsx@${specifier}...\n`);
	await execa('pnpm', ['add', `tsx@${specifier}`], {
		cwd: installDirectory,
	});

	return {
		name: `tsx@${specifier}`,
		cliPath: path.join(installDirectory, 'node_modules/tsx/dist/cli.mjs'),
	};
};
