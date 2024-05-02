import type { GlobalPreloadHook, InitializeHook } from 'node:module';
import type { InitializationOptions } from '../api/register.js';

type State = InitializationOptions & {
	active: boolean;
};

export const state: State = {
	active: true,
};

export const initialize: InitializeHook = async (
	options?: InitializationOptions,
) => {
	if (!options) {
		throw new Error('tsx must be loaded with --import instead of --loader\nThe --loader flag was deprecated in Node v20.6.0 and v18.19.0');
	}

	state.namespace = options.namespace;

	if (options.port) {
		state.port = options.port;

		// Unregister
		options.port.on('message', (message: string) => {
			if (message === 'deactivate') {
				state.active = false;
				options.port!.postMessage('deactivated');
			}
		});
	}
};

export const globalPreload: GlobalPreloadHook = () => 'process.setSourceMapsEnabled(true);';
