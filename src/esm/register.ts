import module from 'node:module';
import { MessageChannel } from 'node:worker_threads';
import { installSourceMapSupport } from '../source-map.js';
import { creatingClient } from '../utils/ipc/client.js';

export const registerLoader = () => {
	const { port1, port2 } = new MessageChannel();

	installSourceMapSupport();

	creatingClient.then((sendToClient) => {
		console.log('create clikent');
		port1.addListener('message', (message) => {
			if (message.type === 'dependency') {
				sendToClient(message);
			}
		});
	});

	// Allows process to exit without waiting for port to close
	port1.unref();

	module.register(
		'./index.mjs',
		{
			parentURL: import.meta.url,
			data: {
				port: port2,
			},
			transferList: [port2],
			// TODO: Strip preflight
		},
	);
};
