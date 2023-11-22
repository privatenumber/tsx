import remapping from '@ampproject/remapping';
import type { SourceMapInput } from '@ampproject/remapping';
import type { RawSourceMap } from '../../source-map.js';

type SourceMap = SourceMapInput | RawSourceMap;

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
	map: RawSourceMap;
	warnings?: unknown[];
};

export const applyTransformersSync = (
	filePath: string,
	code: string,
	transformers: Transformer<TransformerResult>[],
) => {
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
		map: remapping(maps as SourceMapInput[], () => null) as unknown as RawSourceMap,
		warnings,
	};
};

export const applyTransformers = async (
	filePath: string,
	code: string,
	transformers: Transformer<MaybePromise<TransformerResult>>[],
) => {
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
		map: remapping(maps as SourceMapInput[], () => null) as unknown as RawSourceMap,
		warnings,
	};
};
