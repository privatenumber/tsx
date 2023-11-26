import module from 'node:module';
import { installSourceMapSupport } from '../source-map.js';

export const registerLoader = () => {
	installSourceMapSupport();

	module.register(
		'./index.mjs',
		{
			parentURL: import.meta.url,
			data: true,
		},
	);
};
