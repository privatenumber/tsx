import net from 'net';
import fs from 'fs';
import { tmpdir } from '../temporary-directory.js';
import { getPipePath } from './get-pipe-path.js';

type OnMessage = (message: Buffer) => void;

const bufferData = (
	onMessage: OnMessage,
) => {
	let buffer = Buffer.alloc(0);
	return (data: Buffer) => {
		buffer = Buffer.concat([buffer, data]);

		while (buffer.length > 4) {
			const messageLength = buffer.readInt32BE(0);
			if (buffer.length >= 4 + messageLength) {
				const message = buffer.slice(4, 4 + messageLength);
				onMessage(message);
				buffer = buffer.slice(4 + messageLength);
			} else {
				break;
			}
		}
	};
};

export const createIpcServer = () => new Promise<net.Server>(async (resolve, reject) => {
	const server = net.createServer((socket) => {
		socket.on('data', bufferData((message: Buffer) => {
			const data = JSON.parse(message.toString());
			server.emit('data', data);
		}));
	});

	const pipePath = getPipePath(process.pid);

	await fs.promises.mkdir(tmpdir, { recursive: true });
	server.listen(pipePath, () => {
		resolve(server);

		process.on('exit', () => {
			server.close();

			try {
				fs.rmSync(pipePath);
			} catch {}
		});
	});
	server.on('error', reject);

	// Prevent Node from waiting for this socket to close before exiting
	server.unref();
});
