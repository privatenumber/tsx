import fs from 'node:fs';

console.log(
	'loaded esm-ext-js/index.js',
	Boolean(fs),
	Boolean(import('fs')),
	/:7:16/.test((new Error()).stack),
	typeof __dirname,
);

export default 1234;
