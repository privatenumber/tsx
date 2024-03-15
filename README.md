# tsx <a href="https://npm.im/tsx"><img src="https://badgen.net/npm/v/tsx"></a> <a href="https://npm.im/tsx"><img src="https://badgen.net/npm/dm/tsx"></a> <a href="https://packagephobia.now.sh/result?p=tsx"><img src="https://packagephobia.now.sh/badge?p=tsx"></a>

_TypeScript Execute (tsx)_: The easiest way to run TypeScript in Node.js

### Features
- Super fast!
- TypeScript REPL
- Supports `tsconfig.json` [`paths`](https://www.typescriptlang.org/tsconfig#paths)
- Works in both [CommonJS and ESM packages](https://nodejs.org/api/packages.html#type)

> [!TIP]
> **Build your TypeScript projects?**
>
> Try [<img width="20" valign="middle" src="https://github.com/privatenumber/pkgroll/raw/develop/.github/logo.webp"> pkgroll](https://github.com/privatenumber/pkgroll)—the zero-config package bundler used by _tsx_!
>
> _pkgroll_ is a thin Rollup wrapper that makes it so simple for your package to support CommonJS, ESM, & TypeScript.
>
> If you love tsx, you'll love pkgroll too!

<br>

<p align="center">
	<a href="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum">
		<picture>
			<source width="830" media="(prefers-color-scheme: dark)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image=dark">
			<source width="830" media="(prefers-color-scheme: light)" srcset="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image">
			<img width="830" src="https://privatenumber-sponsors.vercel.app/api/sponsor?tier=platinum&image" alt="Premium sponsor banner">
		</picture>
	</a>
</p>

## About
`tsx` is a CLI command (alternative to `node`) for running TypeScript & ESM in both `commonjs` & `module` package types.

tsx is for you if you want:
- A command to _just run_ TypeScript code without  configuration
- Something so fast it's unnoticeable
- Seamless integration across ESM and CJS dependencies

	If you're getting the following error, give tsx a try!

	```
	Error [ERR_REQUIRE_ESM]: require() of ES Module <ESM package> from ./file.js not supported.
	Instead change the require of <ESM package> in ./file.js to a dynamic import() which is available in all CommonJS modules.
	```

### ⚡️ Quick start
Try it out  without setup! Just pass in a TypeScript file:

```sh
npx tsx ./script.ts
```

## Installation

### Local installation

To add tsx to an npm project as a development dependency:
```sh
npm install --save-dev tsx
```

You can reference it directly in the `package.json#scripts` object (you don't need `npx` here):
```json5
{
    "scripts": {
        "dev": "tsx ./file.ts"
    }
}
```

To use the binary, you can call it with [`npx`](https://docs.npmjs.com/cli/v8/commands/npx) while in the project directory:

```sh
npx tsx ...
```

### Global installation

If you want to use tsx anywhere on your computer without [`npx`](https://docs.npmjs.com/cli/v8/commands/npx), install it globally:

```sh
npm install --global tsx
```

Then, you can call `tsx` directly:

```sh
tsx ...
```

## Usage

### tsx is a Node.js wrapper

_tsx_ wraps around Node.js to enhance it with TypeScript support. Because it's a drop-in replacement for `node`, it supports all [Node.js command-line flags](https://nodejs.org/docs/latest-v20.x/api/cli.html).

```sh
# --no-warnings is a Node.js flag
tsx --no-warnings ./file.ts
```

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

Alternatively, use the `TSX_TSCONFIG_PATH` environment variable:

```sh
TSX_TSCONFIG_PATH=./path/to/tsconfig.custom.json tsx ./file.ts
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

Alternatively, use the `TSX_DISABLE_CACHE` environment variable:

```sh
TSX_DISABLE_CACHE=1 tsx ./file.ts
```

### Node.js Loader

`tsx` is a standalone binary designed to be used in place of `node`, but sometimes you'll want to use `node` directly. For example, when adding TypeScript & ESM support to npm-installed binaries.

To use `tsx` as a  Node.js loader, pass it in to the [`--import`](https://nodejs.org/api/module.html#enabling) flag. This will add TypeScript & ESM support for both Module and CommonJS contexts.

```sh
node --import tsx ./file.ts
```

Or as an environment variable:
```sh
NODE_OPTIONS='--import tsx' node ./file.ts
```

> **Note:** The loader is limited to adding support for loading TypeScript/ESM files. CLI features such as _watch mode_ or suppressing "experimental feature" warnings will not be available.

#### ESM only loader

If you only need to add TypeScript support in a Module context, you can use the ESM loader:

##### Node.js v20.6.0 and above
```sh
node --import tsx/esm ./file.ts
```

##### Node.js v20.5.1 and below

```sh
node --loader tsx/esm ./file.ts
```

#### CommonJS only loader
If you only need to add TypeScript & ESM support in a CommonJS context, you can use the CJS loader:

```sh
node --require tsx/cjs ./file.ts
```

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

### VS Code debugging

#### Setup

Create the following configuration file in your project to setup debugging in VS Code:

`.vscode/launch.json`
```json5
{
    "version": "0.2.0",

    "configurations": [
        /*
        Each config in this array is an option in the debug drop-down
        See below for configurations to add...
        */
    ],
}
```

#### Debugging method 1: Run tsx directly from VSCode

1. Add the following configuration to the `configurations` array in `.vscode/launch.json`:
	```json5
	{
	    "name": "tsx",
	    "type": "node",
	    "request": "launch",

	    // Debug current file in VSCode
	    "program": "${file}",

	    /*
	    Path to tsx binary
	    Assuming locally installed
	    */
	    "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/tsx",

	    /*
	    Open terminal when debugging starts (Optional)
	    Useful to see console.logs
	    */
	    "console": "integratedTerminal",
	    "internalConsoleOptions": "neverOpen",

	    // Files to exclude from debugger (e.g. call stack)
	    "skipFiles": [
	        // Node.js internal core modules
	        "<node_internals>/**",

	        // Ignore all dependencies (optional)
	        "${workspaceFolder}/node_modules/**",
	    ],
	}
	```

2. In VSCode, open the file you want to run

3. Go to VSCode's debug panel, select "tsx" in the drop down, and hit the play button (<kbd>F5</kbd>).

#### Debugging method 2: Attach to a running Node.js process

> This method works for any Node.js process and it's not specific to tsx

1. Add the following configuration to the `configurations` array in `.vscode/launch.json`:
	```json
	{
	    "name": "Attach to process",
	    "type": "node",
	    "request": "attach",
	    "port": 9229,
	    "skipFiles": [
	        // Node.js internal core modules
	        "<node_internals>/**",

	        // Ignore all dependencies (optional)
	        "${workspaceFolder}/node_modules/**",
	    ],
	}
	```
2. Run tsx with `--inspect-brk` in a terminal window:

	```sh
	tsx --inspect-brk ./your-file.ts 
	```

3. Go to VSCode's debug panel, select "Attach to process" in the drop down, and hit the play button (<kbd>F5</kbd>).

See the [VSCode documentation on _Launch Configuration_](https://code.visualstudio.com/docs/nodejs/nodejs-debugging#_launch-configuration) for more information.

## Contributing & Support

If you're interested in contributing, please check out the [Contribution Guide](/CONTRIBUTING.md). Your collaboration will be greatly appreciated!

If you're encountering a problem, take advantage of my [_Priority Support_ service](https://github.com/sponsors/privatenumber) for as little as $25. I'd be happy to help you out! 🙂

## FAQ

### Why is it named _tsx_?

`tsx` stands for "TypeScript execute". Mirroring [`npx`](https://docs.npmjs.com/cli/v8/commands/npx), which stands for "Node.js package execute".

The 3-character package name offers an elegant developer experience, allowing usage like: `npx tsx ...`.

Unfortunately, it overlaps with React's [TSX/JSX](https://www.typescriptlang.org/docs/handbook/jsx.html), which stands for "TypeScript XML".

### Does it type check the code it runs?

No. tsx is designed to be a simple TypeScript runner.

If you need type-checking, you can use an IDE like [VS Code](https://code.visualstudio.com) and it will type-check as you code via [IntelliSense](https://code.visualstudio.com/docs/languages/typescript). Alternatively, you can run the TypeScript Compiler only for type-checking (e.g. `tsc --noEmit`) as a linting step.


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

### Does it have a configuration file?

No. tsx's integration with Node.js is designed to be simple & seamless. However, it supports a few properties from `tsconfig.json` to determine how to compile TypeScript files.

### Does it have any limitations?

TypeScript & ESM transformations are handled by [esbuild](https://esbuild.github.io/), so it shares the same limitations such as:

- Compatibility with code executed via `eval()` is not preserved
- Only [certain `tsconfig.json` properties](https://esbuild.github.io/content-types/#tsconfig-json) are supported
- [`emitDecoratorMetadata`](https://www.typescriptlang.org/tsconfig#emitDecoratorMetadata) is not supported 

For details, refer to esbuild's [JavaScript caveats](https://esbuild.github.io/content-types/#javascript-caveats) and [TypeScript caveats](https://esbuild.github.io/content-types/#typescript-caveats) documentation.

## Sponsors

<p align="center">
	<a href="https://github.com/sponsors/privatenumber">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
</p>

