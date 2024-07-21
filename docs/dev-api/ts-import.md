# `tsImport()`

Native dynamic `import()` function to import TypeScript files (supports [top-level await](https://v8.dev/features/top-level-await)).

Use this function for importing TypeScript files without adding TypeScript support to the entire runtime.

The current file path must be passed in as the second argument to resolve the import context.

Since this is designed for one-time use, it does not cache loaded modules.

## Usage

### ESM

```js
import { tsImport } from 'tsx/esm/api'

const loaded = await tsImport('./file.ts', import.meta.url)

// If tsImport is used to load file.ts again,
// it does not yield a cache-hit and re-loads it
const loadedAgain = await tsImport('./file.ts', import.meta.url)
```

If you'd like to leverage module caching, see the [ESM scoped registration](/dev-api/register-esm.md) section.

### CommonJS

```js
const { tsImport } = require('tsx/esm/api')

const loaded = await tsImport('./file.ts', __filename)
```

## `tsconfig.json`

### Custom `tsconfig.json` path
```ts
tsImport('./file.ts', {
    parentURL: import.meta.url,
    tsconfig: './custom-tsconfig.json'
})
```

### Disable `tsconfig.json` lookup
```ts
tsImport('./file.ts', {
    parentURL: import.meta.url,
    tsconfig: false
})
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
