# Module customization hooks

Node's async and sync module customization-hook APIs.

## `module.register()`

`module.register()` installs asynchronous ESM `resolve` and `load` hooks on a dedicated loader worker thread. Synchronous callers communicate through a `MessagePort`, block in [`makeSyncRequest`](https://github.com/nodejs/node/blob/v24.10.0/lib/internal/modules/esm/hooks.js#L598), and wait with [`AtomicsWait`](https://github.com/nodejs/node/blob/v24.10.0/lib/internal/modules/esm/hooks.js#L609).

- PR: [nodejs/node#46826](https://github.com/nodejs/node/pull/46826)
- Verified: v18.19.0, v20.6.0, v21.0.0

## `module.registerHooks()`

`module.registerHooks()` installs synchronous `resolve` and `load` hooks in the current thread. The public entry point is [`registerHooks`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/customization_hooks.js#L111); Node routes work through [`loadWithHooks`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/customization_hooks.js#L365) and [`resolveWithHooks`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/customization_hooks.js#L408).

- PR: [nodejs/node#55698](https://github.com/nodejs/node/pull/55698)
- Verified: v22.15.0, v23.5.0, v24.0.0

## CJS reload support

Sync hooks later gained a load-to-translate handshake that can re-enter the CJS loader. Before the boundary, sync load results lack `shouldBeReloadedByCJSLoader` ([v24.11.0 `load.js#L133-L158`](https://github.com/nodejs/node/blob/v24.11.0/lib/internal/modules/esm/load.js#L133-L158)). At v24.11.1 the load result gains that field ([`load.js#L144-L171`](https://github.com/nodejs/node/blob/v24.11.1/lib/internal/modules/esm/load.js#L144-L171)), and the translator can route the module through `Module._load` ([`translators.js#L334-L363`](https://github.com/nodejs/node/blob/v24.11.1/lib/internal/modules/esm/translators.js#L334-L363)). The same shape is backported to v22.22.3 ([`load.js#L148-L175`](https://github.com/nodejs/node/blob/v22.22.3/lib/internal/modules/esm/load.js#L148-L175)).

- PR: [nodejs/node#59929](https://github.com/nodejs/node/pull/59929)
- Verified: v22.22.3, v24.11.1, v25.1.0

## Resolve result shape

Builtins reach resolve hooks in two shapes:

- An explicit `node:` specifier resolves with `format: 'builtin'` on the CommonJS path ([v24.15.0 `loader.js#L1066-L1072`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1066-L1072)) and with no `format` on the ESM fast path ([`resolve.js#L969`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/resolve.js#L969)), where the default load hook fills in `format: 'builtin'` later ([`load.js#L147`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/load.js#L147)).
- A bare builtin on the CommonJS path resolves through `wrapResolveFilename`, which returns no `format`, and the hook result converts the builtin id to a `node:` URL ([`loader.js#L1048-L1050`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1048-L1050), [`customization_hooks.js#L126-L134`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/customization_hooks.js#L126-L134)).

A resolve hook that special-cases builtins must accept both `format === 'builtin'` and a `node:` URL prefix.

## Load result shape

Load results differ by loader:

- The ESM default load returns `responseURL` and `source` ([v24.15.0 `load.js#L106-L111`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/load.js#L106-L111)). Its synchronous variant, used by `registerHooks`, additionally sets `shouldBeReloadedByCJSLoader` when the format is CommonJS ([`load.js#L132-L173`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/load.js#L132-L173)).
- The CommonJS default load used by `registerHooks` returns only `{ source, format }` ([`loader.js#L1184-L1192`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1184-L1192)).

`responseURL` starts as the requested URL and changes only when source is read, so it is a URL, not proof of disk provenance. It is optional: a `shortCircuit` result need not include it ([validation](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/customization_hooks.js#L257-L280)), so its absence does not prove the module was not read from disk.
