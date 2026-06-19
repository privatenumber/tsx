import { createInitialize, createGlobalPreload, type Data } from './initialize.js';
import { createLoad } from './load.js';
import { createResolve } from './resolve.js';

export const createHooks = () => {
	const data: Data = {
		active: true,
		parsedTsconfig: undefined,
	};

	return {
		initialize: createInitialize(data),
		globalPreload: createGlobalPreload(data),
		load: createLoad(data),
		resolve: createResolve(data),
	};
};
