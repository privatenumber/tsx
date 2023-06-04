# Usage

`tsx` is designed to be a drop-in replacement for `node`, so you can use it just the way you would use Node.js. All command-line arguments (with the exception of a few) are propagated to Node.js.


## Run TypeScript / ESM / CJS module

Pass in a file to run:

```sh
tsx ./file.ts
```

### Custom `tsconfig.json` path
By default, `tsconfig.json` will be detected from the current working directory.

To set a custom path, use the `--tsconfig` flag:

```sh
tsx --tsconfig ./path/to/tsconfig.custom.json ./file.ts
```

Alternatively, use the `ESBK_TSCONFIG_PATH` environment variable:

```sh
ESBK_TSCONFIG_PATH=./path/to/tsconfig.custom.json tsx ./file.ts
```

## Watch mode
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

### Tips
- Press <kbd>Return</kbd> to manually rerun
- Pass in `--clear-screen=false` to disable clearing the screen on rerun

### REPL
Start a TypeScript REPL by running with no arguments:

```sh
tsx
```

## Cache
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


## Hashbang

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
