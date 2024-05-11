# `tsx.require()`

`tsx.require()` is an enhanced `require()` function that can load TypeScript and ESM files.

Use this function for importing TypeScript files in CommonJS mode without adding TypeScript support to the entire runtime.

Note, the current file path must be passed in as the second argument to resolve the import context.

::: warning Caveats
- `import()` & asynchronous `require()` calls in the loaded files are not enhanced.
- Because it compiles ESM syntax to run in CommonJS mode, top-level await is not supported
:::

## CommonJS usage

```js
const tsx = require('tsx/cjs/api')

const tsLoaded = tsx.require('./file.ts', __filename)
const tsFilepath = tsx.require.resolve('./file.ts', __filename)
```

## ESM usage

```js
import { require } from 'tsx/cjs/api'

const tsLoaded = require('./file.ts', import.meta.url)
const tsFilepath = require.resolve('./file.ts', import.meta.url)
```

## Tracking loaded files

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
