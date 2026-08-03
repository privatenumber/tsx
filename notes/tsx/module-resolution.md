# Module-resolution policy

tsx executes runtime code, so its resolver must preserve Node's runtime contract while supporting source TypeScript where tsx explicitly provides that feature. The upstream evidence is owned by [Node](../node/cjs-loader.md), [TypeScript](../typescript/README.md#module-resolution), [esbuild](../esbuild/README.md#module-resolution), and [Bun](../bun/README.md#module-resolution).

## Resolution phases

1. **Exact resolution** loads the path written in the specifier, such as `./value.js`.
2. **Implicit extension search** appends an extension to a path, such as `./value` to `./value.js`.
3. **Extension substitution** replaces a known emitted extension, such as `./value.js` with `./value.ts`.

These phases have different runtime consequences. A dependency that explicitly requests `./metadata.min.json` has selected a runtime asset. tsx must not substitute a sibling JavaScript wrapper before trying that asset.

## Current policy boundary

| Parent and request | Both files exist | Only TypeScript fallback exists | Decision owner |
| --- | --- | --- | --- |
| Local TypeScript or `allowJs` JavaScript parent, `./value.js` | `value.ts` | `value.ts` | Existing source-development behavior ([contract](../../tests/specs/tsconfig.ts)) |
| JavaScript parent in `node_modules`, `./value.js` | `value.js` | `value.ts` | Runtime dependency policy |
| JavaScript parent in `node_modules`, `./asset.json` | `asset.json` | Strict Node failure | Runtime asset policy |

The first dependency row fixes Issue #640 and the ESM reproduction ([contracts](../../tests/specs/tsconfig.ts), [version-sensitive contract](../../tests/specs/version-sensitive.ts)): a consuming project's `allowJs` must not make a package's own `value.js` or JSON asset lose to a sibling source candidate.

Runtime dependency JavaScript resolves an existing requested file before a TypeScript fallback. A missing emitted JavaScript target can fall back to TypeScript source, preserving source-only packages without replacing a published runtime file. This is a runtime policy, not TypeScript type resolution.

The JSON decision is independent. `metadata.min.json` must win when it exists, and a missing explicit JSON request fails rather than reaching `metadata.min.json.js`. This is an asset-selection policy, not TypeScript extension substitution.

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
