import type { GlobalPreloadHook, InitializeHook } from 'node:module';

export const initialize: InitializeHook = async (data) => {
	if (!data) {
		throw new Error('tsx must be loaded with --import instead of --loader\nThe --loader flag was deprecated in Node v20.6.0 and v18.19.0');
	}
};

export const globalPreload: GlobalPreloadHook = () => 'process.setSourceMapsEnabled(true);';

export { load } from './load.js';
export { resolve } from './resolve.js';
