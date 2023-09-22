import './patch-repl';

// Hook require() to transform to CJS
require('./cjs');

/*
Hook import/import() to transform to ESM
Can be used in Node v12 to support dynamic `import()`
*/
export * from './esm';
