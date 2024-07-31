# TypeScript

_tsx_ does not type check your code on its own and expects it to be handled separately. While _tsx_ doesn’t require TypeScript to be installed, and the type checks provided by your IDE might suffice for quick scripts, it is highly recommended to include a type checking step in your projects.


## Development workflow

Type checking is important but it can be time-consuming and expensive to do on every run.

`tsx` alleviates this problem by allowing you to execute TypeScript code directly without being blocked by type errors. Modern IDEs like VSCode provide real-time type checking via [IntelliSense](https://code.visualstudio.com/docs/languages/typescript), reducing the need for manual type checks. This workflow lets you iterate faster on functionality and treat type errors as linting errors rather than compilation requirements.

To incorporate type checking, include it with other linters (e.g. ESLint) in pre-commit hooks or CI checks.

## Installation

Start by installing the following in your project:

- [`typescript`](https://npmjs.com/package/typescript) to type-check with the `tsc` CLI command
- [`@types/node`](https://npmjs.com/package/@types/node) to provide TypeScript with Node.js API types

::: code-group
```sh [npm]
$ npm install -D typescript @types/node
```

```sh [pnpm]
$ pnpm add -D typescript @types/node
```

```sh [yarn]
$ yarn add -D typescript @types/node
```
:::

## tsconfig.json
[`tsconfig.json`](https://www.typescriptlang.org/tsconfig/) is the configuration file used by TypeScript.

### Recommendation

Here's the recommended configuration to make type-checking behave consistently.

```jsonc
{
	"compilerOptions": {

		// Treat files as modules even if it doesn't use import/export
		"moduleDetection": "force",

		// Ignore module structure
		"module": "Preserve",

		// Allow JSON modules to be imported
		"resolveJsonModule": true,

		// Allow JS files to be imported from TS and vice versa
		"allowJs": true,

		// Use correct ESM import behavior
		"esModuleInterop": true,

		// Disallow features that require cross-file awareness
		"isolatedModules": true,
	},
}
```

::: tip
It's also recommended to enable [`verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax) which requires you to write your type imports & exports using explicit syntax. Refactoring may be necessary.

[Read more](https://www.typescriptlang.org/docs/handbook/modules/reference.html#type-only-imports-and-exports)
:::

### JSX

_tsx_ respects the following configurations for JSX in `.jsx` and `.tsx` files:

- [`jsx`](https://www.typescriptlang.org/tsconfig/#jsx)
- [`jsxFactory`](https://www.typescriptlang.org/tsconfig/#jsxFactory)
- [`jsxFragmentFactory`](https://www.typescriptlang.org/tsconfig/#jsxFragmentFactory)
- [`jsxImportSource`](https://www.typescriptlang.org/tsconfig/#jsxImportSource)


## Custom `tsconfig.json` path
By default, `tsconfig.json` is detected from the current working directory.

To pass in a `tsconfig.json` file from a custom path, use the `--tsconfig` flag:

```sh
tsx --tsconfig ./path/to/tsconfig.custom.json ./file.ts
```

## Type checking

Use TypeScript to type check:
```sh
tsc --noEmit
```

(You can omit `--noEmit` if it's already specified in your `tsconfig.json`)

### `package.json` script
Since `tsc` is also a compiler, you can add a script to your `package.json` to specify that it's used for type checking only:
```js
// package.json
{
    // ...

    "scripts": {
        "type-check": "tsc --noEmit"// [!code ++]
    },

    // ...
}
```

### Pre-commit hook
To type check on pre-commit, use [simple-git-hooks](https://www.npmjs.com/package/simple-git-hooks):
```js
// package.json
{
    // ...

    "scripts": {
        // Register Git hooks on `npm install`
        "prepare": "simple-git-hooks"// [!code ++]
    },
    "simple-git-hooks": {
        "pre-commit": "npm run type-check",// [!code ++]

        // Or if you have multiple commands
        "pre-commit": [
            "npm run lint",
            "npm run type-check"// [!code ++]
        ]
    }
}
```

## Compiler limitations
_tsx_ uses [esbuild](https://esbuild.github.io) to compile TypeScript and ESM, so it shares some of the same limitations:

- Compatibility with `eval()` is not preserved
- Only [certain `tsconfig.json` properties](https://esbuild.github.io/content-types/#tsconfig-json) are supported
	- [`emitDecoratorMetadata`](https://www.typescriptlang.org/tsconfig#emitDecoratorMetadata) is not supported

For detailed information, refer to esbuild's [JavaScript caveats](https://esbuild.github.io/content-types/#javascript-caveats) and [TypeScript caveats](https://esbuild.github.io/content-types/#typescript-caveats) documentation.

