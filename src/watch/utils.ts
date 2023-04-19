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
	let timeout: NodeJS.Timeout | undefined;

	return () => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(
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
		&& 'type' in data
		&& data.type === 'dependency'
	);
}
