import module from 'node:module';
import { MessageChannel } from 'node:worker_threads';
import { installSourceMapSupport } from '../source-map.js';

export const registerLoader = () => {
	const { port1, port2 } = new MessageChannel();

	installSourceMapSupport(port1);
	if (process.send) {
		port1.addListener('message', (message) => {
			if (message.type === 'dependency') {
				process.send!(message);
			}
		});
	}

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
		},
	);
};
