import module from 'node:module';

export const register = () => {
	process.setSourceMapsEnabled(true);

	module.register(
		'./index.mjs',
		{
			parentURL: import.meta.url,
			data: true,
		},
	);
};
