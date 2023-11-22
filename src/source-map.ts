import type { Transformed } from './utils/transform/apply-transformers.js';

const inlineSourceMapPrefix = '\n//# sourceMappingURL=data:application/json;base64,';

export const installSourceMapSupport = () => {
	const hasNativeSourceMapSupport = (
		/**
		 * Check if native source maps are supported by seeing if the API is available
		 * https://nodejs.org/dist/latest-v18.x/docs/api/process.html#processsetsourcemapsenabledval
		 */
		'setSourceMapsEnabled' in process

		/**
		 * Overriding Error.prepareStackTrace prevents --enable-source-maps from modifying
		 * the stack trace
		 * https://nodejs.org/dist/latest-v18.x/docs/api/cli.html#:~:text=Overriding%20Error.prepareStackTrace%20prevents%20%2D%2Denable%2Dsource%2Dmaps%20from%20modifying%20the%20stack%20trace.
		 *
		 * https://github.com/nodejs/node/blob/91193825551f9301b6ab52d96211b38889149892/lib/internal/errors.js#L141
		 */
		&& typeof Error.prepareStackTrace !== 'function'
	);

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
