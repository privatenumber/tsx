const globalCjsLoaderCount = Symbol.for('tsx:global-cjs-loader-count');

type GlobalWithCjsLoaderState = typeof globalThis & {
	[globalCjsLoaderCount]?: number;
};

const state = globalThis as GlobalWithCjsLoaderState;

export const isGlobalCjsLoaderActive = () => (
	(state[globalCjsLoaderCount] ?? 0) > 0
);

export const activateGlobalCjsLoader = () => {
	state[globalCjsLoaderCount] = (state[globalCjsLoaderCount] ?? 0) + 1;

	return () => {
		state[globalCjsLoaderCount] = Math.max((state[globalCjsLoaderCount] ?? 1) - 1, 0);
	};
};
