---
outline: deep
---

# Node.js API

> [!CAUTION] Caution: For Advanced Users
The Node.js API is for advanced usage and should not be necessary for the majory of use-cases.

The Node.js API allows you to enhance Node with _tsx_ without directly running `tsx`. This is useful for adding TypeScript support to binaries (e.g. `eslint`), or to your 3rd-party package without affecting the environment (e.g. loading config files), or simply using `node` directly to reduce overhead.

Note, when using the Node.js integrations, CLI features such as [_Watch mode_](/watch-mode.md) will not be available.

## Global enhancement

### Command-line API

Run `node` with `tsx` in the [`--import`](https://nodejs.org/api/module.html#enabling) flag. This will add TypeScript & ESM support for both Module and CommonJS modes, and is identical to what running `tsx` does under the hood.

```sh
node --import tsx ./file.ts
```

#### `NODE_OPTIONS` environment variable

Node.js also accepts command-line flags via the [`NODE_OPTIONS`](https://nodejs.org/api/cli.html#node_optionsoptions) environment variable. This is useful when adding tsx to Node-based binaries.

```sh
NODE_OPTIONS='--import tsx' npx eslint
```

### Programmatic API

Load `tsx` at the top of your entry-file:
```js
import 'tsx'

// Now you can load TS files
await import('./file.ts')
```
