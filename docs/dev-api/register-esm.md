# ESM Register API

The ESM Register API allows you to manually register the enhancement at runtime. But note, this only affects ESM (`.mjs`/`.mts`, and `.js`/`.ts` when `package.json#type` is `module`).

## Usage
```js
import { register } from 'tsx/esm/api'

// Register tsx enhancement
const unregister = register()

await import('./file.ts')

// Unregister when needed
unregister()
```

### Scoped registration

If you want to register without affecting the entire runtime environment, you can add a namespace.

When a namespace is provided, it will return a private `import()` method for you to load files with:

```js
import { register } from 'tsx/esm/api'

const api = register({
    // Pass in a unique namespace
    namespace: Date.now().toString()
})

// Pass in the request and the current file path
// Since this is namespaced, it will not cache hit from prior imports
const loaded = await api.import('./file.ts', import.meta.url)

// This is using the same namespace as above, so it will yield a cache hit
const loaded2 = await api.import('./file.ts', import.meta.url)

api.unregister()
```

### Tracking loaded files

Detect files that get loaded with the `onImport` hook. This can be useful when you want to track dependencies when setting up a watcher.

```ts
register({
    onImport: (file: string) => {
        console.log(file) // 'file:///foo.ts'
    }
})
```
