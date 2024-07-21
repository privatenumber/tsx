# Developer API
The Developer API allows you to enhance Node.js with _tsx_ without needing to use the `tsx` command.

Note that CLI features such as [_Watch mode_](/watch-mode.md) and the [REPL](/usage#repl) will not be available.

## Use-cases

### Directly running `node`

Sometimes, you may need to run `node` directly but still want to use _tsx_. Instead of using the `tsx` command, you can pass it to Node with [`node --import tsx`](/dev-api/node-cli) or you can do [`import 'tsx'`](/dev-api/entry-point) at the top of your script. This is helpful when you need more control over the Node.js environment, are integrating with tools that specifically call `node`, or simply prefer using the `node` command.

### 3rd party packages

Some third-party packages need to load TypeScript files, like configuration files, without affecting the entire runtime environment. The [`tsImport()` API](/dev-api/ts-import) allows these packages to load TypeScript files natively, without causing side effects to the environment.

## Understanding module types

Understanding the Node.js module types, CommonJS (CJS) and ES Module (ESM), can be helpful when using the Developer API.

ESM is the modern standard, indicated by the file extensions `.mjs` for JavaScript and `.mts` for TypeScript. CommonJS, the older format, uses the file extensions `.cjs` for JavaScript and `.cts` for TypeScript. When the file extension is ambiguous, such as `.js` or `.ts`, [`package.json#type`](https://nodejs.org/api/packages.html#type) is used to determine the module type. If `type` is set to `module`, the files are treated as ES Modules. If `type` is set to `commonjs` or not set at all, the files are treated as CommonJS modules.

Although both module types can coexist in the same environment, they have distinct scopes and behaviors. _tsx_ offers APIs to enhance both CommonJS and ES modules selectively. Being aware of these distinctions and knowing which module type you are using will allow you to make informed decisions when opting into these enhancements.
