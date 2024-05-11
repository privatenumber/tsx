
# Only CommonJS mode

Node.js runs files in CommonJS mode when the file extension is `.cjs` (or `.cts` if TypeScript), or `.js` when [`package.json#type`](https://nodejs.org/api/packages.html#type) is undefined or set to `commonjs`.

This section is only for adding tsx in CommonJS mode (doesn't affect `.mjs` or `.mts` files, or `.js` files when `package.js#type` is set to `module`).

::: warning Not for 3rd-party packages
This enhances the entire runtime so it may not be suitable for loading TypeScript files from a 3rd-party package as it may lead to unexpected behavior in user code.

For importing TypeScript files in CommonJS mode without affecting the environment, see [`tsx.require()`](http://localhost:5173/node/tsx-require).
:::

## Command-line API

Pass _tsx_ into the `--require` flag:

```sh
node --require tsx/cjs ./file.ts
```

### `NODE_OPTIONS` environment variable

```sh
NODE_OPTIONS='--require tsx/cjs' npx some-binary
```

## Programmatic API

Load `tsx/cjs` at the top of your entry-file:

```js
require('tsx/cjs')
```

### Registration & Unregistration

To manually register and unregister the tsx enhancement:

```js
const tsx = require('tsx/cjs/api')

// Register tsx enhancement
const unregister = tsx.register()

// Unregister when needed
unregister()
```
