import net from 'net';
import { getPipePath } from './get-pipe-path.js';

export type SendToParent = (data: Record<string, unknown>) => void;

// TODO: Handle when the loader is called directly
const createIpcClient = () => new Promise<SendToParent | void>((resolve) => {
	const pipePath = getPipePath(process.ppid);
	const socket: net.Socket = net.createConnection(
		pipePath,
		() => resolve((data) => {
			const messageBuffer = Buffer.from(JSON.stringify(data));
			const lengthBuffer = Buffer.alloc(4);
			lengthBuffer.writeInt32BE(messageBuffer.length, 0);
			socket.write(Buffer.concat([lengthBuffer, messageBuffer]));
		}),
	);

	/**
	 * Ignore error:
	 * - Called as a loader
	 * - Nested process when using --test
	 */
	socket.on('error', () => resolve());

	// Prevent Node from waiting for this socket to close before exiting
	socket.unref();
});

export const creatingClient = createIpcClient();
