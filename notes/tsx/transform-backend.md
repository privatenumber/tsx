# Transform backend

The transform-backend contract owns tsx's per-file integration semantics and backend re-verification requirements. Upstream implementation evidence belongs to the corresponding tool folder.

## Current integration boundary

tsx uses esbuild's per-file APIs with CommonJS options in `transformSync()` and ESM options in `transform()` ([CJS path](../../src/utils/transform/index.ts#L60-L94), [ESM path](../../src/utils/transform/index.ts#L142-L180)). The target is the running Node version ([configuration](../../src/utils/transform/get-esbuild-options.ts#L7-L13)); cache keys include source identity, transform options, esbuild version, and dynamic-import transformer version ([sync key](../../src/utils/transform/index.ts#L108-L114), [async key](../../src/utils/transform/index.ts#L155-L160)).

The shared configuration enables source maps, whitespace minification, and `keepNames` without identifier or syntax minification ([options](../../src/utils/transform/get-esbuild-options.ts#L21-L50)).

## Transform selection

The CommonJS extension hook transforms TypeScript-family files and JavaScript with static ESM syntax; `.cjs` receives only the targeted dynamic-import rewrite ([extensions](../../src/cjs/api/module-extensions.ts#L17-L29), [selection](../../src/cjs/api/module-extensions.ts#L155-L205)). The ESM hook transforms TypeScript formats and TypeScript-extension URLs, conditionally transforms CommonJS source for interop, and otherwise limits JavaScript changes to dynamic-import rewriting ([async path](../../src/esm/hook/load.ts#L289-L429), [sync path](../../src/esm/hook/load.ts#L486-L577)).

## Backend capability matrix

| Path | Import elision | Function identity | Role |
| --- | --- | --- | --- |
| [esbuild](../esbuild/import-elision.md) | Removes unused qualified aliases but retains originating external imports | [`keepNames`](../esbuild/function-identity.md) restores renamed symbols through module-scoped helpers | Current general backend |
| [Oxc transform](../oxc-transform/import-elision.md) | Cascades type-only status to originating imports by default | [Ordinary transform](../oxc-transform/function-identity.md) avoids name-restoration helpers; downleveling can add root-scope helpers | Blocked general-backend candidate |
| [TypeScript](../typescript/import-elision.md) | Cascading elision uses one-file binding/reference analysis | Not evaluated as a runtime backend | Semantic reference |
| [Node stripping](../node/type-stripping.md) | Rejects non-erasable import aliases | Erasure-only path does not lower supported syntax | Gated fast path only |

## Oxc candidate gates

| Gate | Status | Evidence |
| --- | --- | --- |
| Distribution | Blocked | Node engines, native targets, and fallback behavior do not cover tsx's package contract ([distribution](../oxc-transform/distribution.md), [tsx engines](../../package.json#L71-L76)) |
| Module output | Blocked | Public NAPI preserves ordinary ESM and exposes no complete ESM-to-CJS output ([module output](../oxc-transform/commonjs-output.md)) |
| Helpers | Blocked | Runtime-helper resolution is not guaranteed from arbitrary user files; external mode requires a global, and inline mode is unavailable ([helpers](../oxc-transform/generated-helpers.md)) |
| Runtime semantics | Blocked | Stage 3 decorators and namespace behavior do not satisfy the current contract ([compatibility](../oxc-transform/semantic-compatibility.md)) |
| Configuration | Partial | Filename, target, JSX, decorator, class-field, and import-elision options require a tsx-owned adapter ([configuration](../oxc-transform/configuration.md)) |
| Diagnostics | Blocked before adapter | CommonJS `import.meta` can retain a stale parser error after replacement; resolve source-type/pre-parse behavior before converting remaining severity `Error` results to fatal failures ([diagnostics](../oxc-transform/diagnostics.md)) |
| Source maps | Adapter required | Normalize the parsed v3 map and remove `sourcesContent` outside coverage/debugger mode ([source maps](../oxc-transform/source-maps.md), [tsx policy](../../src/utils/transform/get-esbuild-options.ts#L21-L32)) |

## Current compatibility boundaries

Qualified import-equals aliases are removed by esbuild, but their originating external imports remain ([esbuild analysis](../esbuild/import-elision.md)); current CommonJS output therefore retains module evaluation, while ESM output can retain named-export validation for bindings used only by erased TypeScript syntax.

tsx enables esbuild's `keepNames`, whose restoration calls depend on a module-scoped helper ([esbuild identity](../esbuild/function-identity.md)); a transformed function containing nested restoration calls is not self-contained when serialized without its enclosing module.

## Invariants

- Evaluate backends in per-file, external-module mode; bundle-only output does not establish loader compatibility.
- Target the running Node version so supported syntax is not lowered unnecessarily.
- Preserve observable function and class names; disabling name preservation is not a default fix.
- Current-target TypeScript transformation must not add free helper dependencies to otherwise self-contained functions.
- A replacement backend must match TypeScript's default cascading elision, including removal of an emptied import and its side effects; explicit/verbatim imports preserve runtime intent.
- Keep public configuration backend-neutral; do not expose backend escape hatches or make cache settings alter semantics.
- Do not add library detection, output regexes, helper surgery, or a second parser to patch one backend gap.
- Select native stripping only when a gate proves equivalent behavior; gate misses fall back to the configured transform backend.
- Validate source maps through observable locations instead of generated byte equality.

## Native strip gate

A native-stripping path is eligible only through Node's public `stripTypeScriptTypes()` in explicit strip mode when the file needs no module conversion, the applicable tsconfig enables `verbatimModuleSyntax`, and the original URL is supplied as `sourceUrl`; every throw falls back to the configured transform backend ([Node contract](../node/type-stripping.md), [TypeScript contract](../typescript/type-stripping.md)). Qualified import-equals, TSX, and transform-required syntax are never native-fast-path eligible.

## Re-verification matrix

| Contract | Required coverage | Reverify when |
| --- | --- | --- |
| Import elision | ESM/CJS; type-only/runtime-use twins; explicit side-effect assertion | Backend or import analysis changes |
| Name preservation | Unchanged and collision-renamed function/class names | Renamer or name policy changes |
| Fresh-realm execution | Nested arrow, function, and class serialized into `node:vm` | Backend, target, or helper changes |
| Module output | Async ESM, sync ESM, sync CJS, `import.meta`, dynamic import | Backend replacement |
| Source maps | Sync/async maps plus stack line and column | Backend or map composition changes |
| Syntax/config | JSX factories, decorators, `allowJs`, tsconfig inclusion | Syntax or config adapter changes |
| CJS/ESM interop | Namespace shape, preparse annotations, `require(esm)`, sync/async hooks | Backend or Node gate changes |
| Native fast path | Unsupported syntax falls back; supported output is behaviorally equivalent | Every supported Node major |
| Operational fit | Startup, package size, install/build smoke across supported platforms | Backend dependency or packaging changes |

## Non-goals

- Guarantee arbitrary `Function.prototype.toString()` portability after required syntax lowering introduces external helpers.
- Treat a backend-specific option or partial prepass as a substitute for the full backend contract.
