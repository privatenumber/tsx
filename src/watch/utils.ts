import { gray, lightCyan } from 'kolorist';

const currentTime = () => (new Date()).toLocaleTimeString();

export const log = (...messages: unknown[]) => console.log(
	gray(currentTime()),
	lightCyan('[tsx]'),
	...messages,
);

// From ansi-escapes
// https://github.com/sindresorhus/ansi-escapes/blob/2b3b59c56ff77a/index.js#L80
export const clearScreen = '\u001Bc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (this: unknown, ...args: any[]) => void>(
	originalFunction: T,
	duration: number,
): T => {
	let timeout: NodeJS.Timeout | undefined;

	return function () {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(
			() => Reflect.apply(originalFunction, this, arguments),
			duration,
		);
	} as T;
};
