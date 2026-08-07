import type { Transformed } from './utils/transform/apply-transformers.js';

const inlineSourceMapPrefix = '\n//# sourceMappingURL=data:application/json;base64,';

// TODO: Build this logic into inlineSourceMap
// If undefined, assume sourcemap is enabled
export const shouldApplySourceMap = () => process.sourceMapsEnabled ?? true;

export const inlineSourceMap = (
	{ code, map }: Transformed,
) => (
	code
	+ inlineSourceMapPrefix
	+ Buffer.from(JSON.stringify(map), 'utf8').toString('base64')
);
