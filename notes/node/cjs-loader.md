# CommonJS loader internals

Node's CommonJS resolution, cache, extension-handler, and ESM-error behavior.

## Resolution

`Module._resolveFilename(request, parent, ...)` is the CommonJS resolution entry point ([v24.15.0 `loader.js#L1392`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1392)). It delegates path searching to [`Module._findPath`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L704), which checks the resolved path before trying extension and directory candidates.

[`tryExtensions(basePath, exts, isMain)`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L575) is the later implicit-extension phase. Registered extension handlers can make a request such as `./target.js` resolve `target.js.ts`. Native ESM does not apply this CommonJS-style implicit extension or directory lookup to relative imports.

## Cache identity

Node caches CommonJS modules by resolved filename. `_load` checks [`Module._cache[filename]`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1250-L1256) before evaluating a module, and modules cached by the ESM loader have dedicated circular-load handling ([`loader.js#L1297-L1308`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1297-L1308)).

## `createRequire()` parent identity

`createRequire(filenameOrURL)` builds a synthetic module whose `filename` and `path` drive child resolution ([v24.15.0 `loader.js#L1996-L2049`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1996-L2049)). The input form decides where a URL query survives:

- A `file:` URL is converted with `fileURLToPath()`, which drops the URL search from `filename`. Node keeps the full URL in the module's URL key and passes it as `context.parentURL` to synchronous resolve hooks ([`loader.js#L1097-L1104`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1097-L1104)), so a native hook still sees the query. The query does not reach `parent.filename`.
- An absolute path string is used verbatim as `filename`. A query-shaped suffix such as `?namespace=<id>` stays in that string, so a loader that reads `parent.filename` during resolution still sees it.

A loader that reads the query from `parent.filename` rather than from a hook's `parentURL` therefore passes a path suffix rather than a `file:` URL.

## Extension handlers

Node initializes `Module._extensions` at [`loader.js#L355`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L355). It selects the longest registered extension ([`findLongestRegisteredExtension`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L591-L600)) and dispatches to that handler ([`loader.js#L1545-L1553`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L1545-L1553)).

## ESM error decoration

When ESM resolution fails with `ERR_MODULE_NOT_FOUND` or `ERR_UNSUPPORTED_DIR_IMPORT`, Node's [`defaultResolve`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/resolve.js#L994-L1004) eagerly calls [`decorateErrorWithCommonJSHints`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/resolve.js#L1022). That helper runs [`resolveAsCommonJS`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/resolve.js#L870), creating a temporary CJS module and invoking `CJSModule._resolveFilename`.

Any loader that probes alternate specifiers by catching expected ESM misses therefore pays both the failed ESM resolution and the CJS hint lookup. This cost is inherent to the current Node mechanism, not to a particular loader.

## CJS namespace preparsing

See [cjs-esm-interop.md](./cjs-esm-interop.md#cjs-preparse-and-synthetic-namespaces) for Node's CJS export preparse and namespace construction.
