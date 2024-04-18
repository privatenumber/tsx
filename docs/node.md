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

### CommonJS only
If you only need to add TypeScript & ESM support in a CommonJS context, you can use the CJS loader:

```sh
node --require tsx/cjs ./file.ts
```
