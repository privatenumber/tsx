import net from 'node:net';
import { getPipePath } from './get-pipe-path.js';

export type SendToParent = (data: Record<string, unknown>) => void;

export type Parent = {
	send: SendToParent | void;
};

const connectToServer = () => new Promise<SendToParent | void>((resolve) => {
	const pipePath = getPipePath(process.ppid);
	const socket: net.Socket = net.createConnection(
		pipePath,
		() => {
			const sendToParent: SendToParent = (data) => {
				const messageBuffer = Buffer.from(JSON.stringify(data));
				const lengthBuffer = Buffer.alloc(4);
				lengthBuffer.writeInt32BE(messageBuffer.length, 0);
				socket.write(Buffer.concat([lengthBuffer, messageBuffer]));
			};
			resolve(sendToParent);
		},
	);

	/**
	 * Ignore error when:
	 * - Called as a loader and there is no server
	 * - Nested process when using --test and the ppid is incorrect
	 */
	socket.on('error', () => {
		resolve();
	});

	// Prevent Node from waiting for this socket to close before exiting
	socket.unref();
});

export const parent: Parent = {
	send: undefined,
};

export const connectingToServer = connectToServer();

connectingToServer.then(
	(send) => {
		parent.send = send;
	},
	() => {},
);
