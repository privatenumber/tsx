import remapping from '@ampproject/remapping';
import type { SourceMapInput } from '@ampproject/remapping';

export type SourceMap = ReturnType<typeof remapping>;

type MaybePromise<T> = T | Promise<T>;

type TransformerResult = {
	code: string;
	map: SourceMap;
	warnings?: unknown[];
} | undefined;

type Transformer<
	ReturnType extends MaybePromise<TransformerResult>
> = (
	filePath: string,
	code: string,
) => ReturnType;

export type Transformed = {
	code: string;
	map: SourceMap;
	warnings?: unknown[];
};

export const applyTransformersSync = (
	filePath: string,
	code: string,
	transformers: Transformer<TransformerResult>[],
): Transformed => {
	const maps: SourceMap[] = [];
	const warnings: unknown[] = [];
	const result = { code };

	for (const transformer of transformers) {
		const transformed = transformer(filePath, result.code);

		if (transformed) {
			Object.assign(result, transformed);
			maps.unshift(transformed.map);

			if (transformed.warnings) {
				warnings.push(...transformed.warnings);
			}
		}
	}

	return {
		...result,
		map: remapping(maps as SourceMapInput[], () => null),
		warnings,
	};
};

export const applyTransformers = async (
	filePath: string,
	code: string,
	transformers: Transformer<MaybePromise<TransformerResult>>[],
): Promise<Transformed> => {
	const maps: SourceMap[] = [];
	const warnings: unknown[] = [];
	const result = { code };

	for (const transformer of transformers) {
		const transformed = await transformer(filePath, result.code);

		if (transformed) {
			Object.assign(result, transformed);
			maps.unshift(transformed.map);

			if (transformed.warnings) {
				warnings.push(...transformed.warnings);
			}
		}
	}

	return {
		...result,
		map: remapping(maps as SourceMapInput[], () => null),
		warnings,
	};
};
