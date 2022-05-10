const fs = require('node:fs');

console.log(
	'loaded cjs-ext-cjs/index.cjs',
	Boolean(fs),
	/:6:16/.test((new Error()).stack),
);

module.exports = 1234;
