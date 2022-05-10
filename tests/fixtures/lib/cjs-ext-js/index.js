const fs = require('node:fs');

console.log(
	'loaded cjs-ext-js/index.js',
	Boolean(fs),
	/:6:16/.test((new Error()).stack),
);

module.exports = 1234;
