# Node.js CLI

To use the `node` command directly with _tsx_, pass it as a flag:

```sh
node --import tsx ./file.ts
```

::: details (Deprecated) Node.js v20.5.1 and below

Older Node.js versions use a deprecated API `--loader` instead of `--import`.

```sh
node --loader tsx ./file.ts
```
:::

## Custom `tsconfig.json` path

To specify a custom path to `tsconfig.json`, use an environment variable:

```sh
TSX_TSCONFIG_PATH=./path/to/tsconfig.custom.json node --import tsx ./file.ts
```

## Binaries

If you don't have direct access to the `node` command, use the Node.js [`NODE_OPTIONS` environment variable](https://nodejs.org/api/cli.html#node_optionsoptions) to pass in the flag:

```sh
NODE_OPTIONS='--import tsx' npx some-binary
```

## Advanced usage

### CommonJS mode only

To use _tsx_ for CommonJS files only:

```sh
node --require tsx/cjs ./file.ts
```

### Module mode only

To use _tsx_ for Module files only:

```sh
node --import tsx/esm ./file.ts
```
