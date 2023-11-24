import module from 'node:module';
import { MessageChannel } from 'node:worker_threads';
import { installSourceMapSupport } from '../source-map.js';

export const registerLoader = () => {
	const { port1, port2 } = new MessageChannel();

	installSourceMapSupport();
	if (process.send) {
		port1.addListener('message', (message) => {
			if (message.type === 'dependency') {
				process.send!(message, undefined, undefined, (_error) => {
					// Errors if the parent process is killed during watch
					// e.g. reload (via Return) and hit Ctrl+C immediately
				});
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
