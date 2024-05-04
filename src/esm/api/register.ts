import module from 'node:module';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import type { Message } from '../types.js';

type Options = {
	namespace?: string;
	onImport?: (url: string) => void;
};

export type InitializationOptions = {
	namespace?: string;
	port?: MessagePort;
};

export const register = (
	options?: Options,
) => {
	const { sourceMapsEnabled } = process;
	process.setSourceMapsEnabled(true);

	const { port1, port2 } = new MessageChannel();
	module.register(
		// Load new copy of loader so it can be registered multiple times
		`./esm/index.mjs?${Date.now()}`,
		{
			parentURL: import.meta.url,
			data: {
				namespace: options?.namespace,
				port: port2,
			} satisfies InitializationOptions,
			transferList: [port2],
		},
	);

	const onImport = options?.onImport;
	const importHandler = onImport && ((message: Message) => {
		if (message.type === 'load') {
			onImport(message.url);
		}
	});

	if (importHandler) {
		port1.on('message', importHandler);
		port1.unref();
	}

	// unregister
	return () => {
		if (sourceMapsEnabled === false) {
			process.setSourceMapsEnabled(false);
		}

		if (importHandler) {
			port1.off('message', importHandler);
		}

		port1.postMessage('deactivate');

		// Not necessary to wait, but provide the option
		return new Promise<void>((resolve) => {
			const onDeactivated = (message: Message) => {
				if (message.type === 'deactivated') {
					resolve();
					port1.off('message', onDeactivated);
				}
			};
			port1.on('message', onDeactivated);
		});
	};
};
