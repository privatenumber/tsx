# CommonJS default-import interop

How tsx handles a CommonJS package whose `module.exports` value has both `__esModule` and `default` properties.

## Decision

Native ESM in tsx follows Node: a default import from CommonJS is the complete `module.exports` value. tsx does not automatically reinterpret `__esModule` as a request to bind the import directly to `.default`.

When tsx compiles an importing file to CommonJS, esbuild applies its Babel-compatible interop helper. This distinction follows the importer's execution model, not a guess about the package author's intent.

## The ambiguity

Both of these modules can expose the same runtime value:

```js
// Transpiled ESM
Object.defineProperty(exports, '__esModule', { value: true })
exports.default = handler

// Hand-written CommonJS API
Object.defineProperty(module.exports, '__esModule', { value: true })
module.exports.default = handler
```

The first commonly expects Babel-style interop. The second can intentionally expose the complete object as its public API. A runtime cannot distinguish them from the value's keys, descriptors, source pattern, package metadata, or declaration file. TypeScript identifies the two outputs as structurally identical ([design analysis](https://github.com/microsoft/TypeScript-Website/blob/52338d5c88ceae1ab930a1e9d078368b4d27cb22/packages/documentation/copy/en/modules-reference/appendices/ESM-CJS-Interop.md?plain=1#L306-L312)).

Consequently, no shape-only predicate is absolutely safe. The only safe unwrapping signals are loader-owned transformation provenance, an explicit versioned opt-in, or a package `exports.import` entry that selects native ESM and avoids the ambiguity.

## Current tsx behavior

Let `M` be the CommonJS `module.exports` value and `D` be `M.default`.

| Import path | Result | Owner |
| --- | --- | --- |
| Native static ESM default import | `M` | Node |
| Static import compiled to CommonJS | `D` for marked compiler output | esbuild |
| Native `import()` | namespace with `.default === M` | Node |
| `import()` in tsx-transformed source | `M` when the namespace default is an object containing `__esModule` | tsx compatibility transform |
| Scoped `api.import()` | Native namespace | Node |
| `tsx.require()` | Raw `require()` value, `M` | Node |

The ESM hook preserves ESM output in [`transform()`](../../src/utils/transform/index.ts#L142-L180) and [`load`](../../src/esm/hook/load.ts#L410-L441), so static bindings retain Node semantics. The CommonJS transform uses esbuild's CJS output in [`transformSync()`](../../src/utils/transform/index.ts#L60-L134).

The dynamic-import exception lives in [`transform-dynamic-import.ts`](../../src/utils/transform/transform-dynamic-import.ts#L7-L20). It collapses Node's namespace to `M`, not directly to `D`. Its predicate accepts an inherited `__esModule` property and does not require the property to equal `true`, so it is broader than the common compiler convention. This is legacy compatibility behavior and must not become the policy for native static ESM imports.

## Other tools

| Tool | Marked CommonJS default import | Selector |
| --- | --- | --- |
| [Node](../node/cjs-esm-interop.md#default-import-contract) | Complete `module.exports` | Always for CommonJS targets |
| [TypeScript](../typescript/cjs-esm-interop.md) | `.default` in CJS emit; complete value in ESM emit | Importer output format |
| [esbuild](../esbuild/cjs-esm-interop.md) | `.default` in Babel mode; complete value in Node mode | Importer ESM classification |
| [Bun](../bun/cjs-esm-interop.md) | Usually `.default`; complete value in a `type: module` importee scope | Importee package scope |
| [Deno](https://github.com/denoland/deno/blob/v2.9.4/tests/specs/compile/bundle/npm_cjs_default_export/main.ts#L1-L8) | Complete `module.exports` | Node-compatible runtime behavior |
| [Babel](https://github.com/babel/website/blob/0cd93007b408d2b5a6da12b6fa2563df27f3b424/docs/plugin-transform-modules-commonjs.md?plain=1#L87-L166) | `.default` in `babel` mode; complete value in `node` mode | Explicit `importInterop` option |
| [Rollup](https://github.com/rollup/plugins/blob/commonjs-v29.0.3/packages/commonjs/README.md?plain=1#L235-L275) | `.default` for marked modules in plugin `auto` mode | Plugin or output interop option |
| [Vite/Rolldown](https://github.com/vitejs/vite/blob/v8.2.0/docs/guide/migration.md?plain=1#L229-L258) | Complete value for Node-classified importers; `.default` otherwise | Importer module classification |
| [webpack](https://github.com/webpack/webpack/blob/v5.109.2/lib/runtime/CompatGetDefaultExportRuntimeModule.js#L27-L36) | Complete value for strict ESM; `.default` through compatibility helper | Importer module classification |
| [ts-node](https://github.com/TypeStrong/ts-node/blob/v10.9.2/website/docs/module-type-overrides.md?plain=1#L8-L46) | Follows TypeScript CJS emit or native Node ESM | Selected module mode |

The split is deliberate across most tools: compiler compatibility helpers may trust `__esModule` for transformed importers, while native ESM runtimes retain the complete CommonJS value. Bun is the material runtime exception.

## Boundaries for future changes

Do not add automatic unwrapping to native static ESM imports. It would diverge from Node and change valid CommonJS APIs.

An explicit opt-in compatibility mode could define alternate semantics, but static import support would require importer rewriting or synthetic facade modules. That work must preserve live bindings, re-exports, cycles, mixed named/default imports, cache identity, source maps, and sync/async hook parity.

Separately, a future breaking release can evaluate removing or narrowing dynamic-import unwrapping for ESM-classified sources. Before changing that path, add behavior tests for:

- an intentional CommonJS object with `__esModule` and `default`;
- inherited, false, and non-enumerable `__esModule` properties;
- compiler-produced CJS default and named exports;
- static and dynamic import parity in ESM and CommonJS importers;
- ESM namespace wrappers, cycles, and cache identity.
