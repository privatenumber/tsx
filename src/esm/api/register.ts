import module from 'node:module';
import { MessageChannel, type MessagePort } from 'node:worker_threads';

export type Data = {
	port?: MessagePort;
};

export const register = () => {
	const { sourceMapsEnabled } = process;
	process.setSourceMapsEnabled(true);

	const { port1, port2 } = new MessageChannel();
	module.register(
		// Load new copy of loader so it can be registered multiple times
		`./esm/index.mjs?${Date.now()}`,
		{
			parentURL: import.meta.url,
			data: {
				port: port2,
			} satisfies Data,
			transferList: [port2],
		},
	);

	return () => {
		port1.postMessage('deactivate');
		if (sourceMapsEnabled === false) {
			process.setSourceMapsEnabled(false);
		}

		// Not necessary to wait, but provide the option
		return new Promise<void>((resolve) => {
			port1.once('message', (message) => {
				if (message === 'deactivated') {
					resolve();
				}
			});
		});
	};
};
