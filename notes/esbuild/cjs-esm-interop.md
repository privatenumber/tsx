# CJS default-import interop

How esbuild's CommonJS transform selects Babel-style or Node-style default imports.

esbuild's `__toESM` helper preserves `module.exports.default` for its Babel-compatible path, but creates a default binding to the complete CommonJS value in Node mode ([v0.28.1 runtime](https://github.com/evanw/esbuild/blob/v0.28.1/internal/runtime/runtime.go#L249-L264)). The helper's comment names the distinction: Node compatibility must preserve the complete CommonJS value, while transformed ESM can use the `__esModule` convention.

The printer selects Node mode from the importer's ESM classification, including `.mjs`, `.mts`, and a `type: module` package scope ([v0.28.1 printer](https://github.com/evanw/esbuild/blob/v0.28.1/internal/js_printer/js_printer.go#L1447-L1454)). `platform: 'node'` and the output format alone do not make an importer Node-mode.

When esbuild leaves an ESM import external, Node owns the interop behavior at runtime. `__esModule` is therefore a transform-time compatibility convention, not a safe generic runtime unwrapping signal.
