# Compilation

Compiling your TypeScript files to JavaScript is not handled by _tsx_, but it's a necessary step in most setups.

::: info Should I publish TypeScript files?

No. While _tsx_ is capable of running TypeScript files in dependencies if need be (e.g. monorepos), it's highly discouraged to publish uncompiled TypeScript. Source files require a specific compilation configuration in `tsconfig.json` which may not be read, and [TypeScript performance will degrade](https://x.com/atcb/status/1705675335814271157).
:::

## Compiling an npm package

npm packages are distinguished from applications by defining package entry-points in `package.json`.

[pkgroll](https://github.com/privatenumber/pkgroll) is the recommended bundler for projects using _tsx_. It's developed by the same author and used to compile _tsx_.

Given your source files are in the `src` directory, it automatically infers how to build your package based on the entry points defined in `package.json` by outputting them to the `dist` directory.

### Setup

::: details Basic setup

Set your entry-point in [`exports`](https://nodejs.org/api/packages.html#exports):

```json5
// package.json
{
    "exports": "./dist/index.mjs"
}
```
:::

::: details Dual package (CJS & ESM)

Set your CommonJS & Module entry-points in [`exports`](https://nodejs.org/api/packages.html#exports):

```json5
// package.json
{
    "main": "./dist/index.cjs",
    "module": "./dist/index.mjs",
    "types": "./dist/index.d.cts",

    "exports": {
        "require": {
            "types": "./dist/index.d.cts",
            "default": "./dist/index.cjs"
        },
        "import": {
            "types": "./dist/index.d.mts",
            "default": "./dist/index.mjs"
        }
    }
}
```
:::

::: details Command-line package

Set your CLI entry-point in [`bin`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#bin):

```json5
// package.json
{
    "bin": "./dist/cli.mjs"
}
```
:::

### Build
In your directly, simply run `pkgroll`:

::: code-group
```sh [npm]
$ npx pkgroll
```

```sh [pnpm]
$ pnpm pkgroll
```

```sh [yarn]
$ yarn pkgroll
```
:::

Optionally, add a `build` script for convenience:
```json
// package.json
{
    // Optional: build script
    "scripts": {// [!code ++]
        "build": "pkgroll"// [!code ++]
    }// [!code ++]
}
```

<!-- ## Compiling an application -->
