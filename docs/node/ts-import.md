# `tsImport()`

`tsImport()` is an enhanced `import()` that can load TypeScript files. Because it's an enhancement over the native `import()`, it even supports [top-level await](https://v8.dev/features/top-level-await)!

Use this function for importing TypeScript files in Module mode without adding TypeScript support to the entire runtime.

The current file path must be passed in as the second argument to resolve the import context.

Since this is designed for one-time use, it does not cache loaded modules.

::: warning Caveat
CommonJS files are currently not enhanced due to this [Node.js bug](https://github.com/nodejs/node/issues/51327).
:::

## ESM usage

```js
import { tsImport } from 'tsx/esm/api'

const loaded = await tsImport('./file.ts', import.meta.url)

// If tsImport is used to load file.ts again,
// it does not yield a cache-hit and re-loads it
const loadedAgain = await tsImport('./file.ts', import.meta.url)
```

If you'd like to leverage module caching, see the [ESM scoped registration](/node/esm.md#scoped-registration) section.

## CommonJS usage

```js
const { tsImport } = require('tsx/esm/api')

const loaded = await tsImport('./file.ts', __filename)
```

## Tracking loaded files

Detect files that get loaded with the `onImport` hook:

```ts
tsImport('./file.ts', {
    parentURL: import.meta.url,
    onImport: (file: string) => {
        console.log(file)
        // file:///foo.ts
    }
})
```
