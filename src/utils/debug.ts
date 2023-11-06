export const time = <Argument>(
	name: string,
	_function: (...args: Argument[]) => unknown,
) => function (
		this: unknown,
		...args: Argument[]
	) {
		const timeStart = Date.now();
		const logTimeElapsed = () => {
			const elapsed = Date.now() - timeStart;

			if (elapsed > 10) {
			// console.log({
			// 	name,
			// 	args,
			// 	elapsed,
			// });
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
	};
