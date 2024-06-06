# Only Module mode

Node.js runs files in Module mode when the file extension is `.mjs` (or `.mts` if TypeScript), or `.js` when [`package.json#type`](https://nodejs.org/api/packages.html#type) is set to `module`.

This section is only for adding tsx in Module mode (doesn't affect `.cjs` or `.cts` files, or `.js` files when `package.js#type` is undefined or set to `commonjs`).

::: warning Not for 3rd-party packages
This enhances the entire runtime so it may not be suitable for loading TypeScript files from a 3rd-party package as it may lead to unexpected behavior in user code.

For importing TypeScript files in Module mode without affecting the environment, see the _Scoped registration_ section below or [`tsImport()`](/node/ts-import.md).
:::

## Command-line API

```sh
# Node.js v20.6.0 and above
node --import tsx/esm ./file.ts

# Node.js v20.5.1 and below
node --loader tsx/esm ./file.ts
```

### `NODE_OPTIONS` environment variable

```sh
# Node.js v20.6.0 and above
NODE_OPTIONS='--import tsx/esm' npx some-binary

# Node.js v20.5.1 and below
NODE_OPTIONS='--loader tsx/esm' npx some-binary
```

## Programmatic API

Load `tsx/esm` at the top of your entry-file:

```js
import 'tsx/esm'

// Now you can load TS files
await import('./file.ts')
```

### Registration & Unregistration

```js
import { register } from 'tsx/esm/api'

// register tsx enhancement
const unregister = register()

await import('./file.ts')

// Unregister when needed
unregister()
```

#### Tracking loaded files

Detect files that get loaded with the `onImport` hook:

```ts
register({
    onImport: (file: string) => {
        console.log(file)
        // file:///foo.ts
    }
})
```

#### Tracking loaded files

Detect files that get loaded with the `onImport` hook:

```ts
register({
    onImport: (file: string) => {
        console.log(file)
        // file:///foo.ts
    }
})
```

### Scoped registration

If you want to register tsx without affecting the environment, you can add a namespace.

```js
import { register } from 'tsx/esm/api'

// register tsx enhancement
const api = register({
    namespace: Date.now().toString()
})

// You get a private `import()` function to load TypeScript files
// Since this is namespaced, it will not cache hit from prior imports
const loaded = await api.import('./file.ts', import.meta.url)

// This is using the same namespace as above, so it will yield a cache hit
const loaded2 = await api.import('./file.ts', import.meta.url)

// Unregister when needed
api.unregister()
```
