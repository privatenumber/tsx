# Package subpath resolution

Node separates a dependency's root package map from filesystem resolution of an unexported subpath. The dependency root is `node_modules/dependency/package.json`; a manifest in `node_modules/dependency/subpath/package.json` is a directory manifest, not another package exports map.

## ESM

Node ESM reads `exports` only from the dependency root. When that map exists, it resolves `dependency/subpath` through the root map and does not inspect a nested manifest. Without root exports, `packageResolve()` uses legacy `main` only for `dependency`; it resolves `dependency/subpath` as a literal URL instead ([v24.15.0 `packageResolve()`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/resolve.js#L758-L781), [v18.20.8 equivalent](https://github.com/nodejs/node/blob/v18.20.8/lib/internal/modules/esm/resolve.js#L861-L910)).

`finalizeResolution()` rejects that URL with `ERR_UNSUPPORTED_DIR_IMPORT` when it names a directory ([v24.15.0](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/resolve.js#L225-L259), [v18.20.8](https://github.com/nodejs/node/blob/v18.20.8/lib/internal/modules/esm/resolve.js#L278-L321)). ESM has no implicit extensions or folder mains; directory indexes must be imported with an explicit filename ([v24.15.0 ESM documentation](https://github.com/nodejs/node/blob/v24.15.0/doc/api/esm.md#L187-L194), [resolver properties](https://github.com/nodejs/node/blob/v24.15.0/doc/api/esm.md#L916-L924)).

## CommonJS

CommonJS first applies `exports` from the dependency root. `resolveExports()` parses the request into a package name and subpath, then reads only `node_modules/<name>/package.json` ([v24.15.0](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L675-L687), [v18.20.8](https://github.com/nodejs/node/blob/v18.20.8/lib/internal/modules/cjs/loader.js#L580-L592)).

When no root exports map resolves the request and the filesystem target is a directory, `tryPackage()` reads that directory's `package.json#main`, tries the main target, then falls back to the directory index ([v24.15.0](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/cjs/loader.js#L516-L528), [v18.20.8](https://github.com/nodejs/node/blob/v18.20.8/lib/internal/modules/cjs/loader.js#L428-L440)). A nested `exports` field is not consulted.

## ESM error decoration

For `ERR_MODULE_NOT_FOUND` and `ERR_UNSUPPORTED_DIR_IMPORT`, Node ESM decorates errors with a CommonJS resolution hint before rethrowing ([v24.15.0](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/resolve.js#L990-L1005)). The hint can expose a legacy directory main without changing the ESM resolution result. Loaders must preserve the original ESM error unless they intentionally select a supported compatibility fallback.
