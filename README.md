# tsx <a href="https://npm.im/tsx"><img src="https://badgen.net/npm/v/tsx"></a> <a href="https://npm.im/tsx"><img src="https://badgen.net/npm/dm/tsx"></a> <a href="https://packagephobia.now.sh/result?p=tsx"><img src="https://packagephobia.now.sh/badge?p=tsx"></a>

> _TypeScript Execute (`tsx`)_: Node.js enhanced with [esbuild](https://esbuild.github.io/) to run TypeScript & ESM files

### Features
- Blazing fast on-demand TypeScript & ESM compilation
- Works in both [CommonJS and ESM packages](https://nodejs.org/api/packages.html#type)
- Supports next-gen TypeScript extensions (`.cts` & `.mts`)
- Supports `node:` import prefixes
- Hides experimental feature warnings
- TypeScript REPL
- Resolves `tsconfig.json` [`paths`](https://www.typescriptlang.org/tsconfig#paths)
- Tested on Linux & Windows with Node.js v12~18

<sub>Support this project by ⭐️ starring and sharing it. [Follow me](https://github.com/privatenumber) to see what other cool projects I'm working on! ❤️</sub>

## About
`tsx` is a CLI command (alternative to `node`) for seamlessly running TypeScript & ESM, in both `commonjs` & `module` package types.

It's powered by [esbuild](https://esbuild.github.io/) so it's insanely fast.

Want to just run TypeScript code? Try tsx:

```sh
npx tsx ./script.ts
```

How does it compare to [ts-node](https://github.com/TypeStrong/ts-node)? Checkout the [comparison](https://github.com/privatenumber/ts-runtime-comparison).


## Install

### Local installation
If you're using it in an npm project, install it as a development dependency:
```sh
npm install --save-dev tsx
```

You can reference it directly in the `package.json#scripts` object:
```json5
{
    "scripts": {
        "dev": "tsx ..."
    }
}
```

To use the binary, you can call it with [`npx`](https://docs.npmjs.com/cli/v8/commands/npx) while in the project directory:

```sh
npx tsx ...
```

### Global installation

If you want to use it in any arbitrary project without [`npx`](https://docs.npmjs.com/cli/v8/commands/npx), install it globally:

```sh
npm install --global tsx
```

Then, you can call `tsx` directly:

```sh
tsx ...
```

## Usage

`tsx` is designed to be a drop-in replacement for `node`, so you can use it just the way you would use Node.js. All command-line arguments (with the exception of a few) are propagated to Node.js.


### Run TypeScript / ESM / CJS module

Pass in a file to run:

```sh
tsx ./file.ts
```

#### Custom `tsconfig.json` path
By default, `tsconfig.json` will be detected from the current working directory.

To set a custom path, use the `--tsconfig` flag:

```sh
tsx --tsconfig ./path/to/tsconfig.custom.json ./file.ts
```

### Watch mode
Run file and automatically rerun on changes:

```sh
tsx watch ./file.ts
```

All imported files are watched except from the following directories:
`node_modules`, `bower_components`, `vendor`, `dist`, and `.*` (hidden directories).

#### Ignore files from watch

To exclude files from being watched, pass in a path or glob to the `--ignore` flag:
```sh
tsx watch --ignore ./ignore-me.js --ignore ./ignore-me-too.js ./file.ts
```

#### Tips
- Press <kbd>Return</kbd> to manually rerun
- Pass in `--clear-screen=false` to disable clearing the screen on rerun

### REPL
Start a TypeScript REPL by running with no arguments:

```sh
tsx
```

### Cache
Modules transformations are cached in the system cache directory ([`TMPDIR`](https://en.wikipedia.org/wiki/TMPDIR)). Transforms are cached by content hash, so duplicate dependencies are not re-transformed.

Set the `--no-cache` flag to disable the cache:

```sh
tsx --no-cache ./file.ts
```

### Node.js Loader

`tsx` is a standalone binary designed to be used in place of `node`, but sometimes you'll want to use `node` directly. For example, when adding TypeScript & ESM support to npm-installed binaries.

To use `tsx` as a  Node.js loader, simply pass it in to the [`--loader`](https://nodejs.org/api/esm.html#loaders) flag.

> Note: The loader is limited to adding support for loading TypeScript/ESM files. CLI features such as _watch mode_ or suppressing "experimental feature" warnings will not be available.

```sh
# As a CLI flag
node --loader tsx ./file.ts

# As an environment variable
NODE_OPTIONS='--loader tsx' node ./file.ts
```

> Tip: In rare circumstances, you might be limited to using the [`-r, --require`](https://nodejs.org/api/cli.html#-r---require-module) flag.
>
> You can use [`@esbuild-kit/cjs-loader`](https://github.com/esbuild-kit/cjs-loader), but transformations will only be applied to `require()` (not `import`).


### Hashbang

If you prefer to write scripts that doesn't need to be passed into tsx, you can declare it in the [hashbang](https://bash.cyberciti.biz/guide/Shebang).

Simply add `#!/usr/bin/env tsx` at the top of your file:

_file.ts_
```ts
#!/usr/bin/env tsx

console.log('argv:', process.argv.slice(2))
```

And make the file executable:
```sh
chmod +x ./file.ts
```

Now, you can run the file without passing it into tsx:
```sh
$ ./file.ts hello
argv: [ 'hello' ]
```

## Dependencies

#### [@esbuild-kit/esm-loader](https://github.com/esbuild-kit/esm-loader)
Node.js Loader to transform TypeScript to ESM.

#### [@esbuild-kit/cjs-loader](https://github.com/esbuild-kit/cjs-loader)
Node.js `require()` hook to transform TypeScript & ESM to CommonJS.


## FAQ

### Why is it named `tsx`?

`tsx` stands for "TypeScript execute". Mirroring [`npx`](https://docs.npmjs.com/cli/v8/commands/npx), which stands for "Node.js package execute".

The 3-character package name offers an elegant developer experience, allowing usage like: `npx tsx ...`.

Unfortunately, it overlaps with React's [TSX/JSX](https://www.typescriptlang.org/docs/handbook/jsx.html), which stands for "TypeScript XML".

### Does it do type-checking?

No, [esbuild does not support type checking](https://esbuild.github.io/faq/#:~:text=TypeScript%20type%20checking%20(just%20run%20tsc%20separately)).

It's recommended to run TypeScript separately as a command (`tsc --noEmit`) or via [IDE IntelliSense](https://code.visualstudio.com/docs/languages/typescript).


### How is `tsx` different from [`ts-node`](https://github.com/TypeStrong/ts-node)?

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

### Can it use esbuild plugins?

No. tsx uses esbuild's [Transform API](https://esbuild.github.io/api/#transform-api), which doesn't support plugins.

### Does it have a configuration file?

No. tsx's integration with Node.js is designed to be seamless so there is no configuration.

### Does it have any limitations?

Transformations are handled by esbuild, so it shares the same limitations such as:

- Compatibility with code executed via `eval()` is not preserved
- Only certain `tsconfig.json` properties are supported
- [`emitDecoratorMetadata`](https://www.typescriptlang.org/tsconfig#emitDecoratorMetadata) is not supported 

For details, refer to esbuild's [JavaScript caveats](https://esbuild.github.io/content-types/#javascript-caveats) and [TypeScript caveats](https://esbuild.github.io/content-types/#typescript-caveats) documentation.
