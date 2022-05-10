import fs from 'node:fs';

console.log(
	'loaded ts-ext-tsx/index.tsx',
	Boolean(fs),
	/:6:16/.test((new Error()).stack),
);

const React = {
	createElement: (...args) => Array.from(args),
};

export default (<div>hello world</div>);
