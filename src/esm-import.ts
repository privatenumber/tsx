import { register } from 'node:module';
import { MessageChannel } from 'node:worker_threads';

const { port1, port2 } = new MessageChannel();

if (process.send) {
	port1.addListener('message', (message) => {
		if (message.type === 'dependency') {
			process.send!(message);
		}
	});
}

// Allows process to exit without waiting for port to close
port1.unref();

register(
	'./loader.mjs',
	{
		parentURL: import.meta.url,
		data: {
			port: port2,
		},
		transferList: [port2],
	},
);
