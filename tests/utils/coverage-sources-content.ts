import path from 'node:path';
import fs from 'node:fs/promises';

type SourceMapCache = Record<string, {
	data: {
		sourcesContent: string[];
	} | null;
}>;

export const hasCoverageSourcesContent = async (
	coverageDirectory: string,
) => {
	const fileNames = await fs.readdir(coverageDirectory);
	const coverageData = await Promise.all(
		fileNames.map(
			async file => JSON.parse(
				await fs.readFile(path.join(coverageDirectory, file), 'utf8'),
			),
		),
	);
	return coverageData.some(coverage => (
		coverage['source-map-cache']
		&& (
			Object.values(coverage['source-map-cache'] as SourceMapCache)
				.some(value => typeof value.data?.sourcesContent?.[0] === 'string')
		)
	));
};
