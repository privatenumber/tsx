import type { Transformed } from './utils/transform/apply-transformers.js';

// Avoid emitting a literal `//# sourceMappingURL=` line in minified bundles,
// which source-map parsers (e.g. convert-source-map) misread as a real comment.
const inlineSourceMapPrefix = ['\n//#', 'sourceMappingURL=data:application/json;base64,'].join(' ');

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
