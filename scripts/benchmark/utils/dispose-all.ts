type Resource = Disposable | AsyncDisposable;

export const disposeAll = (resources: Resource[]) => ({
	[Symbol.dispose]: () => {
		for (const resource of resources) {
			// Disposal protocols may be implemented on the resource prototype.
			if (Symbol.dispose in resource) {
				// eslint-disable-next-line no-use-extend-native/no-use-extend-native
				resource[Symbol.dispose]();
			}
		}
	},
	[Symbol.asyncDispose]: () => Promise.all(resources.map(async (resource) => {
		// Disposal protocols may be implemented on the resource prototype.
		if (Symbol.asyncDispose in resource) {
			// eslint-disable-next-line no-use-extend-native/no-use-extend-native
			await resource[Symbol.asyncDispose]();
			return;
		}

		if (Symbol.dispose in resource) {
			// eslint-disable-next-line no-use-extend-native/no-use-extend-native
			resource[Symbol.dispose]();
		}
	})),
});
