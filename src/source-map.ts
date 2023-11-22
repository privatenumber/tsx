import type { MessagePort } from 'node:worker_threads';
import sourceMapSupport, { type UrlAndMap } from 'source-map-support';
import type { Transformed, SourceMap } from './utils/transform/apply-transformers.js';
import { isolatedLoader } from './utils/node-features.js';

type PortMessage = {
	filePath: string;
	map: SourceMap;
};

const inlineSourceMapPrefix = '\n//# sourceMappingURL=data:application/json;base64,';

export const installSourceMapSupport = (
	/**
	 * To support Node v20 where loaders are executed in its own thread
	 * https://nodejs.org/docs/latest-v20.x/api/esm.html#globalpreload
	 */
	loaderPort?: MessagePort,
) => {
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

	const sourcemaps = new Map<string, SourceMap>();

	sourceMapSupport.install({
		environment: 'node',
		retrieveSourceMap(url) {
			const map = sourcemaps.get(url);
			return (
				map
					? ({ url, map } as unknown as UrlAndMap)
					: null
			);
		},
	});

	if (isolatedLoader && loaderPort) {
		loaderPort.addListener(
			'message',
			({ filePath, map }: PortMessage) => sourcemaps.set(filePath, map),
		);
	}

	return (
		{ code, map }: Transformed,
		filePath: string,
		mainThreadPort?: MessagePort,
	) => {
		if (isolatedLoader && mainThreadPort) {
			mainThreadPort.postMessage({ filePath, map } satisfies PortMessage);
		} else {
			sourcemaps.set(filePath, map);
		}
		return code;
	};
};
