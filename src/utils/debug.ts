export const time = (name: string, fn: Function) => {
	return function (this: unknown, ...args: unknown[]) {
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

		const result = Reflect.apply(fn, this, args);
		if (result && 'then' in result) {
			result.then(
				logTimeElapsed,
				// Ignore error in this chain
				() => {},
			);
		} else {
			logTimeElapsed();
		}
		return result;
	};
};
