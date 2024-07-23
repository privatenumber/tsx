// @ts-check
import { defineConfig, pvtnbr } from 'lintroll';

export default defineConfig([
	{
		ignores: ['tests/fixtures'],
	},
	...pvtnbr({
		node: true,
	}),
]);
