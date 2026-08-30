type Restorable = {
	restore: () => void;
};

export const disposableSpy = <Spy extends Restorable>(spy: Spy) => Object.assign(spy, {
	[Symbol.dispose]: () => spy.restore(),
});
