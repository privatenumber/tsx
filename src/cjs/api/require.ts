import { register, type NamespacedUnregister } from './register.js';

let api: NamespacedUnregister | undefined;
const tsxRequire = (
	id: string,
	fromFile: string | URL,
) => {
	if (!api) {
		api = register({
			namespace: Date.now().toString(),
		});
	}
	return api.require(id, fromFile);
};

const resolve = (
	id: string,
	fromFile: string | URL,
	options?: { paths?: string[] | undefined },
) => {
	if (!api) {
		api = register({
			namespace: Date.now().toString(),
		});
	}
	return api.resolve(id, fromFile, options);
};
resolve.paths = require.resolve.paths;

tsxRequire.resolve = resolve;
tsxRequire.main = require.main;
tsxRequire.extensions = require.extensions;
tsxRequire.cache = require.cache;

export { tsxRequire as require };
