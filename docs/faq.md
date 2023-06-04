# FAQ

## Why is it named `tsx`?

`tsx` stands for "TypeScript execute". Mirroring [`npx`](https://docs.npmjs.com/cli/v8/commands/npx), which stands for "Node.js package execute".

The 3-character package name offers an elegant developer experience, allowing usage like: `npx tsx ...`.

Unfortunately, it overlaps with React's [TSX/JSX](https://www.typescriptlang.org/docs/handbook/jsx.html), which stands for "TypeScript XML".

## Does it do type-checking?

No, [esbuild does not support type checking](<https://esbuild.github.io/faq/#:~:text=TypeScript%20type%20checking%20(just%20run%20tsc%20separately)>).

It's recommended to run TypeScript separately as a command (`tsc --noEmit`) or via [IDE IntelliSense](https://code.visualstudio.com/docs/languages/typescript).

## How is `tsx` different from [`ts-node`](https://github.com/TypeStrong/ts-node)?

They're both tools to run TypeScript files. But tsx does a lot more to improve the experience of using Node.js.

tsx _just works_. It's zero-config and doesn't require `tsconfig.json` to get started, making it easy for users that just want to run TypeScript code and not get caught up in the configuration.

It's a single binary with no peer-dependencies (e.g. TypeScript or esbuild), so there is no setup necessary, enabling usage that is elegant and frictionless for first-time users:

```
npx tsx ./script.ts
```

tsx is zero-config because it has smart detections built in. As a runtime, it detects what's imported to make many options in `tsconfig.json` redundant—which was designed for compiling matching files regardless of whether they're imported.

It seamlessly adapts between CommonJS and ESM package types by detecting how modules are loaded (`require()` or `import`) to determine how to compile them. It even adds support for `require()`ing ESM modules from CommonJS so you don't have to worry about your dependencies as the ecosystem migrates to ESM.

[Newer and unsupported syntax](https://esbuild.github.io/content-types/) & features like [importing `node:` prefixes](https://2ality.com/2021/12/node-protocol-imports.html) are downgraded by detecting the Node.js version. For large TypeScript codebases, it has [`tsconfig.json paths`](https://www.typescriptlang.org/tsconfig#paths) aliasing support out of the box.

At the core, tsx is powered by esbuild for [blazing fast TypeScript compilation](https://esbuild.github.io/faq/#:~:text=typescript%20benchmark), whereas `ts-node` (by default) uses the TypeScript compiler. Because esbuild doesn't type check, `tsx` is similar to `ts-node --esm --swc` (which uses the [SWC compiler](https://github.com/TypeStrong/ts-node#swc-1)).

As a bonus, tsx also comes with a watcher to speed up your development.

[Here's an exhaustive technical comparison](https://github.com/privatenumber/ts-runtime-comparison) between `tsx`, `ts-node`, and other runtimes.

## Can it use esbuild plugins?

No. tsx uses esbuild's [Transform API](https://esbuild.github.io/api/#transform-api), which doesn't support plugins.

## Does it have a configuration file?

No. tsx's integration with Node.js is designed to be seamless so there is no configuration.

## Does it have any limitations?

Transformations are handled by esbuild, so it shares the same limitations such as:

- Compatibility with code executed via `eval()` is not preserved
- Only [certain `tsconfig.json` properties](https://esbuild.github.io/content-types/#tsconfig-json) are supported
- [`emitDecoratorMetadata`](https://www.typescriptlang.org/tsconfig#emitDecoratorMetadata) is not supported

For details, refer to esbuild's [JavaScript caveats](https://esbuild.github.io/content-types/#javascript-caveats) and [TypeScript caveats](https://esbuild.github.io/content-types/#typescript-caveats) documentation.

## Does Yarn PnP work?

In CommonJS mode, yes. But in Module/ESM mode, [Node.js version v19.6.0 and up](https://github.com/nodejs/node/blob/v19.6.0/doc/changelogs/CHANGELOG_V19.md#esm-leverage-loaders-when-resolving-subsequent-loaders) is required.
