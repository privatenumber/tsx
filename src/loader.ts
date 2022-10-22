// Hook require() to transform to CJS
import './patch-repl';

require('@esbuild-kit/cjs-loader');

/*
Hook import/import() to transform to ESM
Can be used in Node v12 to support dynamic `import()`
*/
// @ts-expect-error no types necessary
export * from '@esbuild-kit/esm-loader';
