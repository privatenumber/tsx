# Node integration

How tsx integrates with Node. The underlying Node evidence is owned by [notes/node](../node/README.md).

## Feature gates

The current gates are defined in [`src/utils/node-features.ts`](../../src/utils/node-features.ts).

| tsx feature | Node reference |
| --- | --- |
| `moduleRegister` | [Async module hooks](../node/module-hooks.md#moduleregister) |
| `moduleRegisterHooksCjsReload` | [CJS reload support](../node/module-hooks.md#cjs-reload-support) |
| `esmLoadReadFile` | [CJS source from load hooks](../node/cjs-esm-interop.md#esm-importing-cjs) |
| `importAttributes` | [Import attributes](../node/feature-boundaries.md#import-attributes) |
| `importMetaPathProperties` | [`import.meta` path properties](../node/feature-boundaries.md#importmeta-path-properties) |
| `requireEsm` | [CJS requiring ESM](../node/cjs-esm-interop.md#cjs-requiring-esm) |
| `requireEsmNoWarning` | [CJS requiring ESM](../node/cjs-esm-interop.md#cjs-requiring-esm) |
| `cjsNamespaceModuleExports` | [CJS synthetic namespaces](../node/cjs-esm-interop.md#cjs-preparse-and-synthetic-namespaces) |
| `cjsNamespaceFromLoadHook` | [CJS source from load hooks](../node/cjs-esm-interop.md#esm-importing-cjs) |
| `requireEsmExtensionlessMjs` | [CJS requiring ESM](../node/cjs-esm-interop.md#cjs-requiring-esm) |
| `wasmModules` | [WASM modules](../node/feature-boundaries.md#wasm-modules) |
| `modulePackageMainResolution` | [Package `main` assertion fix](../node/feature-boundaries.md#package-main-assertion-fix) |
| `cliTestFlag` and `testRunnerGlob` | [Test runner](../node/feature-boundaries.md#test-runner) |
| `nativeTypeScript` | [Native type stripping](../node/type-stripping.md) |

## Module hooks

tsx uses the async `module.register()` path below the CJS-reload-safe boundary and sync `module.registerHooks()` at or above it ([selection](../../src/esm/index.ts), [registration](../../src/esm/api/register.ts)). The sync path requires the CJS reload handshake, not only the existence of `registerHooks()`.

Node v22.22.3 is included in this gate through the reload-handshake backport ([gate](../../src/utils/node-features.ts)). Gate changes must run the CJS interop and watch suites at each newly supported boundary.

The async worker path adds measurable fixed startup cost. In the `hooks-passthrough` benchmark with 1000 modules on an M5 Pro, Node 24.10.0 async hooks took 200ms and Node 24.15.0 sync hooks took 145ms. The benchmark documentation is in [`scripts/benchmark/README.md`](../../scripts/benchmark/README.md#node-version-axis-async-vs-sync-hooks).

## CommonJS loader integration

tsx patches `Module._resolveFilename`, registers TypeScript extension handlers, and preserves cache identity across transformed data URLs and internal queries ([registration](../../src/cjs/api/register.ts)). The integration points are:

- [`module-resolve-filename/index.ts`](../../src/cjs/api/module-resolve-filename/index.ts) for path and alias resolution;
- [`interop-cjs-exports.ts`](../../src/cjs/api/module-resolve-filename/interop-cjs-exports.ts) and [`preserve-query.ts`](../../src/cjs/api/module-resolve-filename/preserve-query.ts) for CJS cache identity;
- [`module-extensions.ts`](../../src/cjs/api/module-extensions.ts) for extension handlers;
- [`cjs-loader-state.ts`](../../src/utils/cjs-loader-state.ts) for sync-hook CJS pass-through.

Candidate hygiene avoids resolution candidates that cannot win before calling Node ([ESM resolver](../../src/esm/hook/resolve.ts)). This reduces the cost of Node's eager CJS hint decoration while retaining Node as the final authority for package exports, symlinks, and format detection. The resolver-policy owner is [module-resolution.md](./module-resolution.md).

## CJS/ESM interop

tsx transforms TypeScript before Node's CJS preparse stage so Node constructs the namespace from JavaScript source ([load hook](../../src/esm/hook/load.ts)). [`parentImportsCommonJsExports`](../../src/esm/hook/utils.ts) coordinates resolve and load hooks when a parent needs CJS named or namespace exports.

For native `require(esm)` interop, tsx distinguishes accessor descriptors emitted for ESM exports from ordinary CJS data descriptors before honoring a `module.exports` escape hatch ([extension handler](../../src/cjs/api/module-extensions.ts)). This preserves ordinary CJS objects that contain a literal `module.exports` key.

When esbuild rejects top-level `await` for CommonJS output, the extension handler recognizes the diagnostic only for module-system candidates that native `require(esm)` could load. It preserves esbuild's `TransformError` name, message, and source location, and adds Node's loader-facing `ERR_REQUIRE_ESM` or `ERR_REQUIRE_ASYNC_MODULE` code so callers can fall back to `import()` ([Node contract](../node/cjs-esm-interop.md#cjs-requiring-esm)). The shared transformer remains context-neutral, so this mapping does not change ESM loader diagnostics.

## Native TypeScript integration

When Node provides `module-typescript` or `commonjs-typescript`, tsx preserves Node's module classification ([load hook](../../src/esm/hook/load.ts)). When Node provides no format, tsx uses its compatibility resolver and legacy CommonJS default.

tsx remains responsible for transformation syntax Node does not support, extension and path behavior Node leaves to tools, and transformed CJS/ESM interop. Node's type-stripping limits are documented in [notes/node/type-stripping.md](../node/type-stripping.md).

## Re-verification map

When touching an integration boundary, confirm the matching Node mechanism and run a behavior-level test:

| Integration point | tsx site | Node mechanism |
| --- | --- | --- |
| CJS preparse call stack | [`is-from-cjs-lexer.ts`](../../src/cjs/api/module-resolve-filename/is-from-cjs-lexer.ts) | [CJS preparse](../node/cjs-esm-interop.md#cjs-preparse-and-synthetic-namespaces) |
| CJS lexer grammar | [`src/esm/hook/load.ts`](../../src/esm/hook/load.ts) | [CJS preparse](../node/cjs-esm-interop.md#cjs-preparse-and-synthetic-namespaces) |
| CJS cache identity | [`interop-cjs-exports.ts`](../../src/cjs/api/module-resolve-filename/interop-cjs-exports.ts), [`preserve-query.ts`](../../src/cjs/api/module-resolve-filename/preserve-query.ts) | [CJS cache](../node/cjs-loader.md#cache-identity) |
| Extension dispatch | [`module-extensions.ts`](../../src/cjs/api/module-extensions.ts) | [Extension handlers](../node/cjs-loader.md#extension-handlers) |
| Sync resolve/load hooks | [`src/esm/api/register.ts`](../../src/esm/api/register.ts), [`src/esm/hook/`](../../src/esm/hook/) | [Module hooks](../node/module-hooks.md) |
| CJS reload handshake | [`src/esm/hook/load.ts`](../../src/esm/hook/load.ts) | [CJS reload support](../node/module-hooks.md#cjs-reload-support) |
