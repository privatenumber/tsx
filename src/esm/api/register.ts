import module from 'node:module';
import { MessageChannel, type MessagePort } from 'node:worker_threads';

export type Data = {
	port: MessagePort;
};

export const register = () => {
	process.setSourceMapsEnabled(true);

	const { port1, port2 } = new MessageChannel();
	module.register(
		'./esm/index.mjs',
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
		return new Promise((resolve) => {
			port1.once('message', resolve);
		});
	};
};
