import fs from 'node:fs';

console.log(
	'loaded ts-ext-tsx/index.tsx',
	Boolean(fs),
	Boolean(import('fs')),
	/:7:16/.test((new Error()).stack),
	typeof __dirname,
);

const React = {
	createElement: (...args) => Array.from(args),
};

export default (<div>hello world</div>);
