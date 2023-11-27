// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
