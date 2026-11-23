import type { Transformed } from './utils/transform/apply-transformers.js';

// The newline is kept out of this constant on purpose. Minifiers print a string
// with a newline as a template literal with a real line break, which would put
// the marker at the start of a line in tsx's own bundle:
// https://github.com/privatenumber/tsx/issues/877
const inlineSourceMapPrefix = '//# sourceMappingURL=data:application/json;base64,';

// TODO: Build this logic into inlineSourceMap
// If undefined, assume sourcemap is enabled
export const shouldApplySourceMap = () => process.sourceMapsEnabled ?? true;

export const inlineSourceMap = (
	{ code, map }: Transformed,
) => (
	`${code}\n${inlineSourceMapPrefix}${Buffer.from(JSON.stringify(map), 'utf8').toString('base64')}`
);
