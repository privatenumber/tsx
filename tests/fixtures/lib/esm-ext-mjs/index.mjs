import fs from 'node:fs';

console.log(
	'loaded esm-ext-mjs/index.mjs',
	Boolean(fs),
	/:6:16/.test((new Error()).stack),
);

export default 1234;
