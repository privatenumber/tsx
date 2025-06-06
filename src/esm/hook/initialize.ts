import type { InitializeHook } from 'node:module';
import type { InitializationOptions } from '../api/register.js';
import type { Message } from '../types.js';
import { loadTsconfig } from '../../utils/tsconfig.js';

type Data = InitializationOptions & {
	active: boolean;
};

export const data: Data = {
	active: true,
};

export const initialize: InitializeHook = async (
	options?: InitializationOptions,
) => {
	if (!options) {
		throw new Error('tsx must be loaded with --import instead of --loader\nThe --loader flag was deprecated in Node v20.6.0 and v18.19.0');
	}

	data.namespace = options.namespace;

	if (options.tsconfig !== false) {
		loadTsconfig(options.tsconfig ?? process.env.TSX_TSCONFIG_PATH);
	}

	if (options.port) {
		data.port = options.port;

		// Unregister
		options.port.on('message', (message: string) => {
			if (message === 'deactivate') {
				data.active = false;
				options.port!.postMessage({ type: 'deactivated' } satisfies Message);
			}
		});
	}
};

type GlobalPreloadHook = () => string;

// Replaced by `initialize` in Node v20.6.0, v18.19.0
export const globalPreload: GlobalPreloadHook = () => {
	loadTsconfig(process.env.TSX_TSCONFIG_PATH);
	return 'process.setSourceMapsEnabled(true);';
};
