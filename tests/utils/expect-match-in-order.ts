type Searchable = string | RegExp;

const stringify = (
	value: { toString(): string },
) => JSON.stringify(
	value.toString(), // Might be RegExp which requires .toString()
);

const expectedError = (
	expected: Searchable,
	before?: Searchable,
) => new Error(`Expected ${stringify(expected)} ${before ? `to be after ${stringify(before)}` : ''}`);

export const expectMatchInOrder = (
	subject: string,
	expectedOrder: Searchable[],
) => {
	let remaining = subject;
	for (let i = 0; i < expectedOrder.length; i += 1) {
		const previousElement = i > 0 ? expectedOrder[i - 1] : undefined;
		const currentElement = expectedOrder[i];

		if (typeof currentElement === 'string') {
			const index = remaining.indexOf(currentElement);
			if (index === -1) {
				throw expectedError(currentElement, previousElement);
			}
			remaining = remaining.slice(index + currentElement.length);
		} else {
			const match = remaining.match(currentElement);
			if (!match) {
				throw expectedError(currentElement, previousElement);
			}
			remaining = remaining.slice(match.index! + match[0].length);
		}
	}
};
