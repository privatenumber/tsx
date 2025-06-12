import { inspect } from 'node:util';
import { writeSync } from 'node:fs';
import {
	options, bgBlue, black, bgLightYellow, bgGray,
} from 'kolorist';

export const debugEnabled = Number(process.env.TSX_DEBUG);

// Force colors in debug mode
if (debugEnabled) {
	options.enabled = true;
	options.supportLevel = 3;
}

const createLog = (
	name: string,
) => (
	level: number,
	...args: any[]
) => {
	if (!debugEnabled) {
		return;
	}

	if (level > debugEnabled) {
		return;
	}

	const prefix = `${bgGray(` tsx P${process.pid} `)} ${name}`;
	const logMessage = args.map(argumentElement => (
		typeof argumentElement === 'string'
			? argumentElement
			: inspect(argumentElement, { colors: true })
	)).join(' ');

	writeSync(
		1,
		`${prefix} ${logMessage}\n`,
	);
};

export const logCjs = createLog(bgLightYellow(black(' CJS ')));
export const logEsm = createLog(bgBlue(' ESM '));

export const time = <T extends (...args: any[]) => unknown>(
	name: string,
	_function: T,
	threshold = 100,
): T => function (
		this: unknown,
		...args: Parameters<T>
	) {
		const timeStart = Date.now();
		const logTimeElapsed = () => {
			const elapsed = Date.now() - timeStart;

			if (elapsed > threshold) {
				console.log(name, {
					args,
					elapsed,
				});
			}
		};

		const result = Reflect.apply(_function, this, args);
		if (
			result
		&& typeof result === 'object'
		&& 'then' in result
		) {
			(result as Promise<unknown>).then(
				logTimeElapsed,
				// Ignore error in this chain
				() => {},
			);
		} else {
			logTimeElapsed();
		}
		return result;
	} as T;
