# Getting started

::: info Prerequisites
You must have [Node.js](https://nodejs.org/) v18 or higher installed. tsx aims to support the [LTS versions](https://endoflife.date/nodejs) of Node.js.
:::

## Quick try

If you want to try `tsx` without installing it, you can use it with [npx](https://docs.npmjs.com/cli/v8/commands/npx).

In your command-line, simply pass in a TypeScript file you'd like to run:

```sh
npx tsx ./script.ts
```

## Installation

### Install to a project
If you want to add `tsx` as a development dependency to an npm project, `cd` into the project and run the following:

::: code-group
```sh [npm]
$ npm install -D tsx
```

```sh [pnpm]
$ pnpm install -D tsx
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
:::


#### Using it in `scripts`

Common commands can be added to [`package.json#scripts`](https://docs.npmjs.com/cli/v10/using-npm/scripts) 

You can reference `tsx` directly in the command like so (you don't need `npx`):
```json5
{
    // ...

    "scripts": {
        "dev": "tsx ./file.ts"
    },

    // ...
}
```


### Install globally

If you want to use `tsx` anywhere on your computer (without [`npx`](https://docs.npmjs.com/cli/v8/commands/npx)), install it globally:


::: code-group
```sh [npm]
$ npm install -g tsx
```

```sh [pnpm]
$ pnpm install -g tsx
```
:::

Then, you can call `tsx` directly:

```sh
tsx file.ts
```
