# esb

Node.js runtime that supports TypeScript & ESM for `module` and `commonjs` package types.

### Features
- Transforms TypeScript & ESM -> to CJS or ESM (depending on [package type](https://nodejs.org/api/packages.html#type))
- Supports new extensions `.cjs` + `.mjs` (and `.cts` &`.mts`)
- Handles `node:` import prefixes
- Sourcemap support
- Supports dynamic `import()`
- Hides experimental feature warnings

## Install
```sh
npm install --save-dev @esbuild-kit/esb
```

### Install globally
Install it globally to use it anywhere, outside of your npm project, without [npx](https://docs.npmjs.com/cli/v8/commands/npx).
```sh
npm install --global @esbuild-kit/esb
```

## Usage

> Note: Commands are prefixed with [`npx`](https://docs.npmjs.com/cli/v8/commands/npx) to execute the `esb` binary, but it's not necessary if globally installed or when using it in the `script` object in `package.json`

### Run TypeScript / ESM / CJS module

```sh
npx esb ./file.js
```

### Watch mode
Run file and automatically re-reun on changes.
Automatically watches all JS/TS files, and ignores files from directories `node_modules`, `bower_components`, `vendor`, `dist`, and `.*` (hidden directories).

Press <kbd>Return</kbd> to manually re-run.

```sh
npx esb watch ./file.js
```


process.nodeArguments

process.nodeBinary should be overwritten to remove the flags


### Cache
Modules transformations are cached in the system cache directory ([`TMPDIR`](https://en.wikipedia.org/wiki/TMPDIR)). Transforms are cached by content hash so duplicate dependencies are not re-transformed.

Set the `--no-cache` flag to disable the cache:

```sh
npx esb --no-cache ./file.js
```

## Dependencies

- [@esbuild-kit/esm-loader](https://github.com/esbuild-kit/esm-loader) - TypeScript to ESM transpiler using the Node.js loader API.

- [@esbuild-kit/cjs-loader](https://github.com/esbuild-kit/cjs-loader) - TypeScript & ESM to CJS transpiler using the Node.js loader API.
