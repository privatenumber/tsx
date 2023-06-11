import { gray, lightCyan } from 'kolorist';

const currentTime = () => (new Date()).toLocaleTimeString();

export const log = (...messages: any[]) => console.log(
	gray(currentTime()),
	lightCyan('[tsx]'),
	...messages,
);

// From ansi-escapes
// https://github.com/sindresorhus/ansi-escapes/blob/2b3b59c56ff77a/index.js#L80
export const clearScreen = '\u001Bc';

export function debounce(
	originalFunction: () => void,
	duration: number,
) {
	let timer: NodeJS.Timeout | undefined;

	return () => {
		if (timer) {
			clearTimeout(timer);
		}

		timer = setTimeout(
			() => originalFunction(),
			duration,
		);
	};
}

export function isDependencyPath(
	data: any,
): data is { type: 'dependency'; path: string } {
	return (
		data
		&& typeof data === 'object'
		&& data.type === 'dependency'
	);
}

export async function timeout<T>(
	promise: Promise<T>,
	cleanup: () => void,
	time: number,
): Promise<T> {
	let timer: NodeJS.Timeout | null = null;
	try {
		return await Promise.race([
			promise,
			new Promise<T>((_resolve, reject) => {
				timer = setTimeout(reject, time);
			}),
		]);
	} finally {
		if (timer) {
			clearTimeout(timer);
		}
		if (cleanup) {
			cleanup();
		}
	}
}
