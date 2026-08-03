# CJS/ESM interop

How Node bridges CommonJS and ES modules.

## CJS preparse and synthetic namespaces

When ESM imports CJS, Node synthesizes an ESM namespace from static CJS source analysis before evaluating the CJS module.

- In v24.15.0, the CJS translator calls [`cjsPreparseModuleExports`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/translators.js#L381) before building the wrapper ([`translators.js#L212`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/translators.js#L212)).
- The parser returns exports and reexports, following reexports recursively ([`translators.js#L393-L418`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/translators.js#L393-L418)).
- Node marks CJS modules cached by the ESM loader with `kIsCachedByESMLoader` ([`translators.js#L368`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/translators.js#L368)); the CJS loader uses that marker during circular loads ([`loader.js#L1297-L1308`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1297-L1308)).
- Node v23 adds a synthetic `'module.exports'` namespace key ([v23.0.0 `translators.js#L187`](https://github.com/nodejs/node/blob/v23.0.0/lib/internal/modules/esm/translators.js#L187)).

The lexer implementation changed without changing the supported grammar:

- v24.11.1 uses vendored `cjs-module-lexer` ([grammar](https://github.com/nodejs/node/blob/v24.11.1/deps/cjs-module-lexer/README.md#L7-L51)).
- v24.14.0 uses `internalBinding('cjs_lexer')` through [nodejs/node#61456](https://github.com/nodejs/node/pull/61456), backed by Merve ([grammar](https://github.com/nodejs/node/blob/v24.14.0/deps/merve/merve.h#L82-L102)).

## ESM importing CJS

| Node behavior | PR | Verified releases |
| --- | --- | --- |
| The ESM `load` hook can return source for `format === 'commonjs'`. | [nodejs/node#50825](https://github.com/nodejs/node/pull/50825) | v20.11.0, v21.3.0 |
| CJS source returned by a load hook can be preparsed into a namespace. | [nodejs/node#50825](https://github.com/nodejs/node/pull/50825), [#54769](https://github.com/nodejs/node/pull/54769) | `[20.11.0, 21.0.0)` and `>=21.3.0` |

The load hook receives import-attributes context and reads CJS source at the boundary ([v20.11.0 `load.js#L113-L145`](https://github.com/nodejs/node/blob/v20.11.0/lib/internal/modules/esm/load.js#L113-L145)). The translator then preparses CJS before namespace creation and evaluates via `CJSModule._load` ([v20.11.0 `translators.js#L190-L203`](https://github.com/nodejs/node/blob/v20.11.0/lib/internal/modules/esm/translators.js#L190-L203)).

## CJS requiring ESM

| Node behavior | PR | Verified releases or window |
| --- | --- | --- |
| CJS `require()` can load eligible ESM instead of throwing `ERR_REQUIRE_ESM`. | [nodejs/node#55085](https://github.com/nodejs/node/pull/55085) | v20.19.0, v22.12.0, v23.0.0 |
| Normal `require(esm)` stops printing the experimental warning. | [nodejs/node#56194](https://github.com/nodejs/node/pull/56194) | v20.19.0, v22.13.0, v23.5.0 |
| Extensionless `.mjs` lookup was broken. | [nodejs/node#55085](https://github.com/nodejs/node/pull/55085), [#55590](https://github.com/nodejs/node/pull/55590) | `[20.19.0, 20.19.5)`, `[22.12.0, 22.14.0)` |
| Synthetic CJS namespaces expose `'module.exports'`. | [nodejs/node#53848](https://github.com/nodejs/node/pull/53848) | v23.0.0 |
