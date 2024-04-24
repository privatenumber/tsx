import './patch-repl.js';

// Hook require() to transform to CJS
// eslint-disable-next-line import-x/no-unresolved
require('./cjs/index.cjs');

/*
Hook import/import() to transform to ESM
Can be used in Node v12 to support dynamic `import()`
*/
export * from './esm/index.js';
