import { constants as osConstants } from 'os';
import { ChildProcess, type Serializable } from 'child_process';

type SignalMessage = Serializable & {
	type: 'signal';
	signal: NodeJS.Signals;
};

// The interval between checks to see if child has acknowledged a signal.
// Practically speaking, this is the minimum amount to wait before a signal
// that is sent only to parent will be relayed to child.
const POLL_INTERVAL_MS = 100;
// The maximum time to wait to see if child has acknowledged a signal.
// Practically speaking, if the client is in a tight synchronous loop, or
// has been stopped in a debugger, then they'll likely get multiple notifications.
const POLL_MAX_TIME_MS = 1000;

const clientAckTimestamps: { [index: string]: number } = {
	SIGINT: 0,
	SIGTERM: 0,
};

let lastSignal: NodeJS.Signals | null = null;

export type SignalHandler = {
	(): void;
	install(): NodeJS.Process;
	uninstall(): void;
};
export function handleSignal(
	signal: NodeJS.Signals,
	childProcess: ChildProcess,
): SignalHandler {
	let pending = 0;
	let timeout: NodeJS.Timeout | null = null;
	const handle = () => {
		pending += 1;
		lastSignal = signal;
		const signalTime = Date.now();
		const maxTime = signalTime + POLL_MAX_TIME_MS;
		if (timeout !== null) {
			clearTimeout(timeout);
		}
		const notify = () => {
			const clientAckDelta = (clientAckTimestamps[signal] || 0) - signalTime;
			if (Math.abs(clientAckDelta) < POLL_MAX_TIME_MS) {
				// do not notify - client has handled it
			} else if (Date.now() > maxTime) {
				// timeout - if we're still spinning, then we need to notify client
				while (pending > 0) {
					childProcess.kill(signal);
					pending -= 1;
				}
			} else {
				timeout = setTimeout(notify, POLL_INTERVAL_MS);
			}
		};
		// no need to wait the very first time
		timeout = setTimeout(notify, 0);
	};
	handle.install = () => process.on(signal, handle);
	handle.uninstall = () => {
		process.off(signal, handle);
		if (timeout !== null) {
			clearTimeout(timeout);
		}
	};

	return handle;
}

export function installClientSignalAckHandler(childProcess: ChildProcess) {
	childProcess.on('message', (message: SignalMessage) => {
		const { type } = message;
		if (type === 'signal') {
			clientAckTimestamps[message.signal] = Date.now();
		}
	});
}

export function getErrorCode(
	childProcess: ChildProcess,
	defaultCode: number,
): number {
	if (childProcess.exitCode !== null) {
		return childProcess.exitCode;
	}
	if (lastSignal !== null) {
		return 128 + osConstants.signals[lastSignal];
	}
	return defaultCode;
}
