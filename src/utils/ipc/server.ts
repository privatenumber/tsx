import net from 'net';
import fs from 'fs/promises';
import { tmpdir } from '../temporary-directory.js';
import { getPipePath } from './get-pipe-path.js';

export const createIpcServer = () => new Promise<net.Server>(async (resolve, reject) => {
	const server = net.createServer((socket) => {
		let buffer = Buffer.alloc(0);

		const handleIncomingMessage = (message: Buffer) => {
			const data = JSON.parse(message.toString());
			server.emit('data', data);
		};

		socket.on('data', (data) => {
			buffer = Buffer.concat([buffer, data]);

			while (buffer.length > 4) {
				const messageLength = buffer.readInt32BE(0);
				if (buffer.length >= 4 + messageLength) {
					const message = buffer.slice(4, 4 + messageLength);
					handleIncomingMessage(message);
					buffer = buffer.slice(4 + messageLength);
				} else {
					break;
				}
			}

			// console.log({ data, string: data.toString() });
			// server.emit('data', JSON.parse(data));
		});
	});

	await fs.mkdir(tmpdir, {
		recursive: true,
	});

	const pipePath = getPipePath(process.pid);
	server.listen(pipePath, () => resolve(server));
	server.on('error', reject);

	// // Prevent Node from waiting for this socket to close before exiting
	// server.unref();

	// TODO: servver close
});
