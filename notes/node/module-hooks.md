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
