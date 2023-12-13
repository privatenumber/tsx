// @ts-check

import { defineConfig, pvtnbr } from '@pvtnbr/eslint-config';

export default defineConfig([
	{
		ignores: [
			'tests/fixtures',
		],
	},
	...pvtnbr({
		node: true,
	}),
]);
