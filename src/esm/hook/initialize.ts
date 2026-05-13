import type { InitializeHook } from 'node:module';
import type { TsconfigResult } from 'get-tsconfig';
import type { InitializationOptions } from '../api/register.js';
import type { Message } from '../types.js';
import { loadTsconfig } from '../../utils/tsconfig.js';

type Data = InitializationOptions & {
	active: boolean;
	onImport?: (url: string) => void;
	parsedTsconfig: TsconfigResult | undefined;
};

export const data: Data = {
	active: true,
	parsedTsconfig: undefined,
};

export type { Data };

export const createData = (
	options?: InitializationOptions & {
		onImport?: (url: string) => void;
	},
): Data => {
	const hookData: Data = {
		active: true,
		namespace: options?.namespace,
		onImport: options?.onImport,
		parsedTsconfig: undefined,
		port: options?.port,
		tsconfig: options?.tsconfig,
	};

	if (options?.tsconfig !== false) {
		hookData.parsedTsconfig = loadTsconfig(options?.tsconfig ?? process.env.TSX_TSCONFIG_PATH);
	}

	return hookData;
};

export const initialize: InitializeHook = async (
	options?: InitializationOptions,
) => {
	if (!options) {
		throw new Error('tsx must be loaded with --import instead of --loader\nThe --loader flag was deprecated in Node v20.6.0 and v18.19.0');
	}

	Object.assign(data, createData(options));

	if (options.port) {
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
	data.parsedTsconfig = loadTsconfig(process.env.TSX_TSCONFIG_PATH);
	return 'process.setSourceMapsEnabled(true);';
};
