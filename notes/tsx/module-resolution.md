# Module-resolution policy

tsx executes runtime code, so its resolver must preserve Node's runtime contract while supporting source TypeScript where tsx explicitly provides that feature. The upstream evidence is owned by [Node](../node/cjs-loader.md), [TypeScript](../typescript/module-resolution.md), [esbuild](../esbuild/module-resolution.md), and [Bun](../bun/module-resolution.md).

## Resolution phases

1. **Exact resolution** loads the path written in the specifier, such as `./value.js`.
2. **Implicit extension search** appends an extension to a path, such as `./value` to `./value.js`.
3. **Extension substitution** replaces a known emitted extension, such as `./value.js` with `./value.ts`.

These phases have different runtime consequences. A dependency that explicitly requests `./metadata.min.json` has selected a runtime asset. tsx must not substitute a sibling JavaScript wrapper before trying that asset.

## Current policy boundary

| Parent and request | Both files exist | Only TypeScript fallback exists | Decision owner |
| --- | --- | --- | --- |
| Local TypeScript or `allowJs` JavaScript parent, `./value.js` | `value.ts` | `value.ts` | Existing source-development behavior ([contract](../../tests/specs/tsconfig.ts)) |
| ESM JavaScript parent in `node_modules`, `./value.js` | `value.js` | `value.ts` | Runtime dependency policy |
| Patched-CJS JavaScript parent in `node_modules`, `./value.js` | `value.js` | Strict Node failure | Patched-CJS compatibility boundary |
| JavaScript parent in `node_modules`, `./asset.json` | `asset.json` | Strict Node failure | Runtime asset policy |

Runtime dependency JavaScript resolves an existing requested file before any TypeScript fallback. ESM can retry a missing emitted JavaScript target as TypeScript source, preserving source-only packages without replacing a published runtime file; patched CJS does not perform that retry. This is runtime policy, not TypeScript type resolution.

The JSON decision is independent. `metadata.min.json` must win when it exists, and a missing explicit JSON request fails rather than reaching `metadata.min.json.js`. This is an asset-selection policy, not TypeScript extension substitution.

## Emitted-extension substitution

The shared mapping is `.js -> [.ts, .tsx, .js, .jsx]`, `.jsx -> [.tsx, .ts, .jsx, .js]`, `.mjs -> [.mts]`, and `.cjs -> [.cts]` ([mapping](../../src/utils/extension-resolution.ts#L4-L23)). ESM TypeScript parents and local `allowJs` JavaScript parents probe source candidates before the exact emitted path; other ESM JavaScript parents try the exact path first and retry TypeScript only after a missing-path error ([classification](../../src/esm/hook/resolve.ts#L175-L192), [retry](../../src/esm/hook/resolve.ts#L328-L401)). Patched-CJS TypeScript/local-`allowJs` parents and namespaced `tsx.require()` graphs are TypeScript-first, while ordinary JavaScript parents do not retry a missing emitted path ([CJS classification](../../src/cjs/api/module-resolve-filename/index.ts#L88-L112), [CJS flow](../../src/cjs/api/module-resolve-filename/resolve-ts-extensions.ts#L76-L150)).

| Resolver path and parent | Exact + source | Exact only | Source only | Neither |
| --- | --- | --- | --- | --- |
| ESM, TypeScript parent or local `allowJs` JavaScript | Source | Exact | Source | Fail |
| ESM, other local/dependency JavaScript | Exact | Exact | Source | Fail |
| Patched CJS, TypeScript parent or local `allowJs` JavaScript | Source | Exact | Source | Fail |
| Patched CJS, other local/dependency JavaScript | Exact | Exact | Fail | Fail |

Dependency TypeScript parents remain TypeScript-first; consumer `allowJs` never promotes dependency JavaScript. The sync ESM hook defers CommonJS requests to the patched resolver only when the global CJS loader is active, so ESM-only registration can expose the ESM fallback row to `require()` ([hook boundary](../../src/esm/hook/resolve.ts#L924-L938)).

## Parent classification

Dependency classification must inspect `new URL(parentURL).pathname`, not a substring of the serialized URL ([ESM resolver](../../src/esm/hook/resolve.ts)). URL queries and fragments are not filesystem location. A local parent URL containing `?source=/node_modules/` must retain local tsconfig path behavior, while a real dependency pathname must not receive the consumer's aliases.

## Required test matrix

Before changing resolver code, cover each policy row through every execution boundary:

1. CommonJS `require()` through the patched `Module._resolveFilename` path.
2. ESM async hooks on Node versions without `module.registerHooks()`.
3. ESM sync hooks on Node versions with `module.registerHooks()`.
4. A TypeScript pre-import that forces the modern async hook path.
5. Local `allowJs` behavior, so a dependency fix cannot globally reorder `.js` and `.ts` candidates.
6. Parent URL classification with no query, a `/node_modules/` query, and a real `node_modules` pathname.

## Non-goals

- Reimplement TypeScript's declaration-first or `@types` lookup.
- Reimplement TypeScript's output-to-input path remapping.
- Apply tsconfig path aliases inside actual dependencies.
- Change Node's ESM requirement for explicit relative file extensions.
- Treat JSON load transformation and JSON path selection as one problem.
