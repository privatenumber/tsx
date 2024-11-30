# Getting started

### Prerequisites

Before you can start using _tsx_, ensure that you have [Node.js installed](https://nodejs.org/en/download/). _tsx_ is designed to be compatible with all [maintained versions](https://endoflife.date/nodejs) of Node.js.

## Quickstart

`tsx` can be executed with [npx](https://docs.npmjs.com/cli/commands/npx/) — a tool to run npm packages without installing them.

In your command-line, simply pass in a TypeScript file you'd like to run. It's that simple!

```sh
npx tsx ./script.ts
```

## Project installation

To install `tsx` as a project development dependency, run the following command in your project directory:

::: code-group
```sh [npm]
$ npm install -D tsx
```

```sh [pnpm]
$ pnpm add -D tsx
```

```sh [yarn]
$ yarn add -D tsx
```
:::

#### Using `tsx`

Once installed, you can invoke it with your package manager while in the project directory:

::: code-group
```sh [npm]
$ npx tsx ./file.ts
```

```sh [pnpm]
$ pnpm tsx ./file.ts
```

```sh [yarn]
$ yarn tsx ./file.ts
```
:::

#### Using it in `package.json#scripts`

Project commands are usually organized in the [`package.json#scripts`](https://docs.npmjs.com/cli/v10/using-npm/scripts) object.

In the `scripts` object, you can reference `tsx` directly without `npx`:

```js
// package.json
{
    "scripts": {
        "start": "tsx ./file.ts"// [!code highlight]
    }
}
```

## Global installation

If you want to use `tsx` anywhere on your computer (without [`npx`](https://docs.npmjs.com/cli/commands/npx/)), install it globally:

::: code-group
```sh [npm]
$ npm install -g tsx
```

```sh [pnpm]
$ pnpm add -g tsx
```

```sh [yarn]
Yarn 2 doesn't support global installation
https://yarnpkg.com/migration/guide#use-yarn-dlx-instead-of-yarn-global
```
:::

This allows you to call `tsx` directly:

```sh
tsx file.ts
```
