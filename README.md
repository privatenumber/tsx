# tsx

Node.js enhanced with [esbuild](https://esbuild.github.io/) to run TypeScript & ESM

### Features
- Blazing fast on-demand TypeScript & ESM compilation
- Works in both [CommonJS and ESM packages](https://nodejs.org/api/packages.html#type)
- Supports next-gen TypeScript extensions (`.cts` & `.mts`)
- Supports `node:` import prefixes
- Hides experimental feature warnings
- TypeScript REPL
- Tested on Linux & Windows with Node.js v12~18

## Install
```sh
npm install --save-dev tsx
```

### Install globally
Install it globally to use it anywhere, outside of your npm project, without [npx](https://docs.npmjs.com/cli/v8/commands/npx).
```sh
npm install --global tsx
```

## Usage

> Note: Commands are prefixed with [`npx`](https://docs.npmjs.com/cli/v8/commands/npx) to execute the `tsx` binary, but it's not necessary if globally installed or when using it in the `script` object in `package.json`

### Run TypeScript / ESM / CJS module

Pass in a file to run:

```sh
npx tsx ./file.ts
```

### Watch mode
Run file and automatically re-run on changes.

All imported files are watched except from the following directories:
`node_modules`, `bower_components`, `vendor`, `dist`, and `.*` (hidden directories).

Press <kbd>Return</kbd> to manually re-run.

```sh
npx tsx watch ./file.ts
```

### REPL
Start a TypeScript REPL by running `tsx` with no arguments.

```sh
npx tsx
```

### Cache
Modules transformations are cached in the system cache directory ([`TMPDIR`](https://en.wikipedia.org/wiki/TMPDIR)). Transforms are cached by content hash so duplicate dependencies are not re-transformed.

Set the `--no-cache` flag to disable the cache:

```sh
npx tsx --no-cache ./file.ts
```

### Node.js Loader

tsx is a standalone binary used in-place of Node.js, but sometimes you'll want to use `node` directly. For example, when adding TypeScript & ESM support to Node.js binaries.

To use tsx with Node.js, pass it into the [`--loader`](https://nodejs.org/api/esm.html#loaders) flag.

> Note: Node.js's experimental feature warnings will not be suppressed when used as a loader

```sh
# As a CLI flag
node --loader tsx ./file.ts

# As an environment variable
NODE_OPTIONS='--loader tsx' node ./file.ts
```

If you're looking to use the [`-r, --require`](https://nodejs.org/api/cli.html#-r---require-module) flag, you can use [`@esbuild-kit/cjs-loader`](https://github.com/esbuild-kit/cjs-loader) but transformations _will not_ be applied to dynamic `import()`s.

## Dependencies

- [@esbuild-kit/esm-loader](https://github.com/esbuild-kit/esm-loader) - Node.js Loader to transform TypeScript to ESM.

- [@esbuild-kit/cjs-loader](https://github.com/esbuild-kit/cjs-loader) - Node.js `requie()` hook to transform TypeScript & ESM to CommonJS.


## FAQ

### Does it do type-checking?

No, [esbuild does not support type checking](https://esbuild.github.io/faq/#:~:text=TypeScript%20type%20checking%20(just%20run%20tsc%20separately)).

It's recommended to run TypeScript separately as a command (`tsc --noEmit`) or via [IDE IntelliSense](https://code.visualstudio.com/docs/languages/typescript).


### How is `tsx` different from [`ts-node`](https://github.com/TypeStrong/ts-node)?

They are both tools to run TypeScript files.

The main difference is that `tsx` is powered by [esbuild](https://esbuild.github.io/) for blazing fast TypeScript compilation. Whereas `ts-node` uses the TypeScript compiler, [which is not as fast](https://esbuild.github.io/faq/#:~:text=typescript%20benchmark).

Because esbuild doesn't do type checking, `tsx` is more equivalent to `ts-node --transpileOnly`.

If you migrated from `ts-node`, please share your performance gains [here](https://github.com/esbuild-kit/tsx/discussions/10)!
