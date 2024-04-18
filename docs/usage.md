---
outline: deep
---

# Basic usage

## Replacing `node` with `tsx`

`tsx` is a drop-in replacement for `node`, meaning you can use it the exact same way (supports all [command-line flags](https://nodejs.org/docs/latest-v20.x/api/cli.html)).

If you have an existing `node` command, simply substitute `tsx`.

```sh
node --no-warnings --env-file=.env ./file.js
```
<p class="text-center">↓</p>

```sh
tsx --no-warnings --env-file=.env ./file.js
```

::: warning Node.js version matters
Under the hood, `tsx` calls `node`. This means the supported features in `tsx` depends on the version of Node.js you have installed.
:::

## TypeScript

### No type-checking

`tsx` allows you to execute TypeScript code directly without performing type checks.

Modern code editors, such as VSCode and WebStorm, use [IntelliSense](https://code.visualstudio.com/docs/languages/typescript) to provide real-time type checking. This feature offers immediate feedback on type errors and coding guidance, diminishing the need for frequent manual type checks previously performed using `tsc`.

By treating type checking as a linting step rather than a compilation requirement, and deferring it to commit hooks or CI checks, devs can view type errors as non-blocking warnings. This approach promotes more flexible and rapid iteration. After all, types are safeguards to ensure correct function usage and may often be imperfect during the iterative phases of development.

If you'd really like to type check before running the code, you still can:
```sh
tsc --noEmit && tsx ./file.ts
```

### Custom `tsconfig.json` path
By default, `tsconfig.json` is detected from the current working directory.

To set a custom path, use the `--tsconfig` flag:

```sh
tsx --tsconfig ./path/to/tsconfig.custom.json ./file.ts
```

Alternatively, use the `TSX_TSCONFIG_PATH` environment variable:

```sh
TSX_TSCONFIG_PATH=./path/to/tsconfig.custom.json tsx ./file.ts
```

## REPL
Start a TypeScript REPL by running `tsx` with no arguments:

```sh
tsx
```
