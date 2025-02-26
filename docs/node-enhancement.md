# Node.js enhancement

## Swap `node` for `tsx`

`tsx` is a drop-in replacement for `node`, meaning you can use it the exact same way (supports all [command-line flags](https://nodejs.org/api/cli.html)).

If you have an existing `node` command, simply substitute it with `tsx`.

```sh
node --no-warnings --env-file=.env ./file.js
```
<p class="text-center">↓</p>

```sh
tsx --no-warnings --env-file=.env ./file.js
```

::: warning Node.js version matters
Under the hood, `tsx` calls `node`. This means the Node.js features supported in `tsx` depend on the Node.js version you have installed.
:::

## Flag & arguments positioning

Just like with `node`, correctly positioning flags and arguments is important when using `tsx`.

Place _tsx_ flags immediately after `tsx`, and place flags and arguments for your script after the script path.

```sh
tsx [tsx flags] ./file.ts [flags & arguments for file.ts]
```

## TypeScript REPL

_tsx_ extends the Node.js REPL to support TypeScript, allowing interactive coding sessions directly in TypeScript.

```sh
tsx
```

::: info What is the Node.js REPL?
The [Node.js REPL](https://nodejs.org/en/learn/command-line/how-to-use-the-nodejs-repl) is an interactive prompt that immediately executes input code, ideal for learning and experimenting. _tsx_ enhances this tool by adding TypeScript support.
:::

## Test runner

::: Available in Node.js v21 and above
:::

_tsx_ enhances the Node.js built-in [test runner](https://nodejs.org/api/test.html) with TypeScript support. You can use it the same way:

```sh
tsx --test
```

It will automatically recognize test files with TypeScript extensions:
- `**/*.test.?[cm][jt]s`
- `**/*-test.?[cm][jt]s`
- `**/*_test.?[cm][jt]s`
- `**/test-*.?[cm][jt]s`
- `**/test.?[cm][jt]s`
- `**/test/**/*.?[cm][jt]s`
