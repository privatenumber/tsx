// Hook require() to transform to CJS
require('@esbuild-kit/cjs-loader');

// Hook import/import() to transform to ESM
// Can be used in Node v12 to support dynamic `import()`
export * from '@esbuild-kit/esm-loader';
