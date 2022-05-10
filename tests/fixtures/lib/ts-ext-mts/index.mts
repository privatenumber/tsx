import fs from 'node:fs';

console.log(
	'loaded ts-ext-mts/index.mts',
	Boolean(fs),
	/:6:16/.test((new Error()).stack),
);

function valueNumber(value: number) {
	return value;
}

export default valueNumber(1234);
