import type { MessagePort } from 'node:worker_threads';
import sourceMapSupport, { type UrlAndMap } from 'source-map-support';
import type { Transformed } from './utils/transform/apply-transformers';
import { compareNodeVersion } from './utils/compare-node-version';

/**
 * Node.js loaders are isolated from v20
 * https://github.com/nodejs/node/issues/49455#issuecomment-1703812193
 * https://github.com/nodejs/node/blob/33710e7e7d39d19449a75911537d630349110a0c/doc/api/module.md#L375-L376
 */
const isolatedLoader = compareNodeVersion([20, 0, 0]) >= 0;

export type RawSourceMap = UrlAndMap['map'];

type PortMessage = {
	filePath: string;
	map: RawSourceMap;
};

const inlineSourceMapPrefix = '\n//# sourceMappingURL=data:application/json;base64,';

export function installSourceMapSupport(
	/**
	 * To support Node v20 where loaders are executed in its own thread
	 * https://nodejs.org/docs/latest-v20.x/api/esm.html#globalpreload
	 */
	loaderPort?: MessagePort,
) {
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

	const sourcemaps = new Map<string, RawSourceMap>();

	sourceMapSupport.install({
		environment: 'node',
		retrieveSourceMap(url) {
			const map = sourcemaps.get(url);
			return map ? { url, map } : null;
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
}
