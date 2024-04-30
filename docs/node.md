---
outline: deep
---

# Node.js

## Hooks

> Previously known as _Loaders_ ([renamed in v21](https://github.com/nodejs/loaders/issues/95))

_tsx_ is primarily designed to be a standalone binary used in place of `node`. But sometimes, you'll want to use `node` directly. For example, when adding TypeScript & ESM support to npm-installed binaries that specify node in hashbang.

### Usage

To use `tsx` as a  Node.js loader, pass it in to the [`--import`](https://nodejs.org/api/module.html#enabling) flag. This will add TypeScript & ESM support for both Module and CommonJS contexts.

```sh
node --import tsx ./file.ts
```

Or via the [`NODE_OPTIONS`](https://nodejs.org/api/cli.html#node_optionsoptions) environment variable:
```sh
NODE_OPTIONS='--import tsx' node ./file.ts
```

::: warning
When using the hook, CLI features such as [_Watch mode_](/watch-mode) will not be available.
:::


### ES Modules only

If you only need to add TypeScript support in a Module context, you can use the ESM loader:

##### Node.js v20.6.0 and above
```sh
node --import tsx/esm ./file.ts
```

##### Node.js v20.5.1 and below

```sh
node --loader tsx/esm ./file.ts
```

---

# CommonJS

If you only need to add TypeScript & ESM support in a CommonJS context.

## Command-line API

Pass tsx into the `--require` flag:

```sh
node --require tsx/cjs ./file.ts
```

## Node.js API

### Globally patching `require`

#### Enabling TSX Enhancement

To enhance the global `require()` function with TypeScript support, prepend your script with the following line:

```js
require('tsx/cjs')
```

#### Manual Registration & Unregistration

To manually register and unregister the TypeScript enhancement on the global `require()`:

```js
const tsx = require('tsx/cjs/api')

// Register tsx enhancement for all global require() calls
const unregister = tsx.register()

// Optionally, unregister the enhancement when needed
unregister()
```

### Isolated `require()`

In situations where TypeScript support is needed only for loading a specific file (e.g. within third-party packages) without affecting the global environment, you can utilize tsx's custom `require` function.

Note the current file path must be passed in as the second argument so it knows how to resolve relative paths.

#### CommonJS usage
```js
const tsx = require('tsx/cjs/api')

const loaded = tsx.require('./file.ts', __filename)
const filepath = tsx.require.resolve('./file.ts', __filename)
```

#### ESM usage
```js
import { require } from 'tsx/cjs/api'

const loaded = require('./file.ts', import.meta.url)
const filepath = require.resolve('./file.ts', import.meta.url)
```

#### Module graph

If you're interested in seeing what files were loaded, you can traverse the CommonJS module graph. This can be useful for watchers:

```js
// To detect watch files, we can parse the CommonJS module graph
const resolvedPath = require.resolve('./file', import.meta.url)

const collectDependencies = module => [
    module.filename,
    ...module.children.flatMap(collectDependencies)
]

console.log(collectDependencies(require.cache[resolvedPath]))
// ['/file.ts', '/foo.ts', '/bar.ts']
```
