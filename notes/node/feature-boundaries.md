# Node feature boundaries

Smaller Node runtime features and bug-fix boundaries.

## Import attributes

`import ... with { type: 'json' }` succeeds the earlier import-assertions syntax. The load path aliases assertions into attributes ([v20.10.0 `load.js#L116-L124`](https://github.com/nodejs/node/blob/v20.10.0/lib/internal/modules/esm/load.js#L116-L124)), and validation checks the `type` attribute ([`assert.js#L57-L80`](https://github.com/nodejs/node/blob/v20.10.0/lib/internal/modules/esm/assert.js#L57-L80)).

- Verified: v18.19.0, v20.10.0, v21.0.0

## `import.meta` path properties

`import.meta.dirname` and `import.meta.filename` are initialized from the file URL path ([v20.11.0 `initialize_import_meta.js#L61-L62`](https://github.com/nodejs/node/blob/v20.11.0/lib/internal/modules/esm/initialize_import_meta.js#L61-L62)).

- PR: [nodejs/node#48740](https://github.com/nodejs/node/pull/48740)
- Verified: v20.11.0, v21.2.0

## WASM modules

Node supports importing `.wasm` modules. The import-attributes validator treats `wasm` as an implicit type ([v22.19.0 `assert.js#L32`](https://github.com/nodejs/node/blob/v22.19.0/lib/internal/modules/esm/assert.js#L32)).

- PR: [nodejs/node#57038](https://github.com/nodejs/node/pull/57038)
- Verified: v22.19.0, v24.5.0

## Package `main` assertion fix

An assertion in `legacyMainResolve` affected Node 18 package-main resolution. The resolver entry and package path are visible at [v18.20.4 `resolve.js#L176`](https://github.com/nodejs/node/blob/v18.20.4/lib/internal/modules/esm/resolve.js#L176) and [`resolve.js#L903`](https://github.com/nodejs/node/blob/v18.20.4/lib/internal/modules/esm/resolve.js#L903).

- PR: [nodejs/node#55708](https://github.com/nodejs/node/pull/55708)
- Verified: v18.20.5; later major lines did not carry the assertion

## Test runner

Node's `--test` flag is documented in the [v18.1.0 CLI reference](https://github.com/nodejs/node/blob/v18.1.0/doc/api/cli.md). Test-runner glob support shipped in [v21.0.0](https://github.com/nodejs/node/releases/tag/v21.0.0).
