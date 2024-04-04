import type { Transformed } from './utils/transform/apply-transformers.js';

const inlineSourceMapPrefix = '\n//# sourceMappingURL=data:application/json;base64,';

export const installSourceMapSupport = () => {
	/**
	 * Check if native source maps are supported by seeing if the API is available
	 * https://nodejs.org/dist/latest-v18.x/docs/api/process.html#processsetsourcemapsenabledval
	 *
	 * Previously, we also checked Error.prepareStackTrace to opt-out of source maps
	 * as per this recommendation:
	 * https://nodejs.org/dist/latest-v18.x/docs/api/cli.html#:~:text=Overriding%20Error.prepareStackTrace%20prevents%20%2D%2Denable%2Dsource%2Dmaps%20from%20modifying%20the%20stack%20trace.
	 *
	 * But it's been removed because:
	 * 1. It's set by default from Node v21.6.0 and v20.12.0
	 * 2. It may have been possible for a custom prepareStackTrace to parse the source maps
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
