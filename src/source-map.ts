import type { Transformed } from './utils/transform/apply-transformers.js';

const inlineSourceMapPrefix = '\n//# sourceMappingURL=data:application/json;base64,';

export const installSourceMapSupport = () => {
	/**
	 * Check if native source maps are supported by seeing if the API is available
	 * https://nodejs.org/dist/latest-v18.x/docs/api/process.html#processsetsourcemapsenabledval
	 */
	const hasNativeSourceMapSupport = 'setSourceMapsEnabled' in process;

	if (hasNativeSourceMapSupport) {
		process.setSourceMapsEnabled(true);

		return (
			{ code, map }: Transformed,
		) => (
			code
			+ inlineSourceMapPrefix
			+ Buffer.from(JSON.stringify(map), 'utf8').toString('base64')
		);
	}

	return ({ code }: Transformed) => code;
};
