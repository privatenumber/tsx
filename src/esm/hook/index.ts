import type { GlobalPreloadHook, InitializeHook } from 'node:module';

export const initialize: InitializeHook = async (data) => {
	if (!data) {
		throw new Error('tsx must be loaded with --import instead of --loader\nThe --loader flag was deprecated in Node v20.6.0 and v18.19.0');
	}
};

/**
 * Technically globalPreload is deprecated so it should be in loaders-deprecated
 * but it shares a closure with the new load hook
 */
export const globalPreload: GlobalPreloadHook = () => `
const require = getBuiltin('module').createRequire("${import.meta.url}");
require('../source-map.cjs').installSourceMapSupport();
`;

export { load } from './load.js';
export { resolve } from './resolve.js';
