import remapping from '@ampproject/remapping';
import type { SourceMapInput } from '@ampproject/remapping';
import type { RawSourceMap } from '../../source-map';

type SourceMap = SourceMapInput | RawSourceMap;

type MaybePromise<T> = T | Promise<T>;

type IntersectionArray<T extends unknown[]> = (
	T extends [infer FirstElement, ...infer RestElements]
		? FirstElement & IntersectionArray<RestElements>
		: unknown
);

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

type Results<
	Array_ extends Transformer<MaybePromise<TransformerResult>>[]
> = {
	[Key in keyof Array_]: (
		Array_[Key] extends Transformer<infer ReturnType>
			? Awaited<ReturnType>
			: unknown
	);
};

type AddSourceMap<T> = Omit<T, 'map'> & { map: RawSourceMap };

export type Transformed = {
	code: string;
	map: RawSourceMap;
	warnings?: unknown[];
};

export function applyTransformersSync<
	T extends Readonly<Transformer<TransformerResult>[]>,
>(
	filePath: string,
	code: string,
	transformers: T,
) {
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
	} as unknown as AddSourceMap<IntersectionArray<Results<[...T]>>>;
}

export async function applyTransformers<
	T extends Readonly<Transformer<MaybePromise<TransformerResult>>[]>,
>(
	filePath: string,
	code: string,
	transformers: T,
) {
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
	} as unknown as AddSourceMap<IntersectionArray<Results<[...T]>>>;
}
