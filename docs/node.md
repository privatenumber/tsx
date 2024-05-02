---
outline: deep
---

# Node.js integration

This guide details how to integrate `tsx` with Node.js, allowing you to enhance Node.js with TypeScript support without directly running `tsx`. Because Node.js offers Module and CommonJS contexts, you can opt into enhancing them selectively.

This setup is useful for running binaries with TypeScript support, developing packages that load TypeScript files, or direct usage of `node`.


::: info Only TypeScript & ESM support
When using the Node.js integrations, CLI features such as [_Watch mode_](/watch-mode) will not be available.
:::

## Module & CommonJS enhancement

### Command-line API

To use `tsx` as a  Node.js loader, pass it in to the [`--import`](https://nodejs.org/api/module.html#enabling) flag. This will add TypeScript & ESM support for both Module and CommonJS contexts.

```sh
node --import tsx ./file.ts
```

Node.js also allows you to pass in command-line flags via the [`NODE_OPTIONS`](https://nodejs.org/api/cli.html#node_optionsoptions) environment variable:
```sh
NODE_OPTIONS='--import tsx' node ./file.ts
```

This means you can also add tsx to binaries to add TypeScript support:
```sh
NODE_OPTIONS='--import tsx' npx eslint
```

### Node.js API

Add this at the top of your entry-file:
```js
import 'tsx'
```

## Only Module enhancement

> For situations where you need TypeScript support only in a Module context (using `.mjs` files or `package.json` with `"type": "module"`).

### Command-line API 

```sh
# Node.js v20.6.0 and above
node --import tsx/esm ./file.ts

# Node.js v20.5.1 and below
node --loader tsx/esm ./file.ts
```

### Registration & Unregistration
```js
import { register } from 'tsx/esm/api'

// register tsx enhancement
const unregister = register()

// Unregister when needed
unregister()
```

## Only CommonJS enhancement

> For situations where you need TypeScript and ESM support only in a CommonJS context (using `.cjs` files or `package.json` with `"type": "commonjs"`).

### Command-line API

Pass _tsx_ into the `--require` flag:

```sh
node --require tsx/cjs ./file.ts
```

This is the equivalent of adding the following at the top of your entry file, which you can also do:

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

## Enhanced `import()` & `require()`

tsx exports enhanced `import()` or `require()` functions, allowing you to load TypeScript/ESM files without affecting the runtime environment.

### `tsImport()`

The `import()` function enhanced to support TypeScript. Great for supporting top-level await. 

::: warning Caveats
`require()` calls in the imported files are not enhanced
:::

#### ESM usage

Note, the current file path must be passed in as the second argument to resolve the import context.

```js
import { tsImport } from 'tsx/esm/api'

const loaded = await tsImport('./file.ts', import.meta.url)
```

#### CommonJS usage

```js
const { tsImport } = require('tsx/esm/api')

const loaded = await tsImport('./file.ts', __filename)
```

### `tsx.require()`

The `require()` function patched to support TypeScript and ESM. Since this only patches `require()`, it's inherently just the CommonJS enhancement, so it cannot load Module TypeScript files (`.mts` or `.ts` files in Module context).


::: warning Caveats
Asynchronous `require()` & `import()` calls will not be enhanced
:::

Doesn't add require enhancement beyond the initial call. For example, this will not work:
```js
setTimeout(() => {
    require('./file.ts')
})
```

#### CommonJS usage

Note, the current file path must be passed in as the second argument to resolve the import context.

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

#### Module graph inspection

Because the CommonJS API tracks loaded modules in `require.cache`, you can use it to identify loaded files for dependency tracking. This can be useful when implementing a watcher.

```js
const resolvedPath = tsx.require.resolve('./file', import.meta.url)

const collectDependencies = module => [
    module.filename,
    ...module.children.flatMap(collectDependencies)
]

console.log(collectDependencies(tsx.require.cache[resolvedPath]))
// ['/file.ts', '/foo.ts', '/bar.ts']
```
