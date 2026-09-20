# Data URL modules

Node loads `data:` modules directly from their URL payload. Supported ESM media types include `text/javascript`, `application/json`, and `application/wasm` ([Node ESM documentation](https://github.com/nodejs/node/blob/v22.9.0/doc/api/esm.md#L219-L241)).

## Query and fragment handling

Before Node 22.9.0, the ESM loader parsed a data module from `url.pathname`, so URL query and fragment metadata were outside the module body ([v20.20.2 loader](https://github.com/nodejs/node/blob/v20.20.2/lib/internal/modules/esm/load.js#L31-L73)). Node 22.9.0 adopted the Fetch-standard data-URL processor ([backport](https://github.com/nodejs/node/commit/40ba89e4524b6593badbdfa9e716c0523a0fa234)); it serializes the URL with only the fragment excluded, then decodes the remaining body ([v22.9.0 processor](https://github.com/nodejs/node/blob/v22.9.0/lib/internal/data_url.js#L35-L96)).

Appending a query to a base64 data URL therefore changes its encoded body on Node 22.9.0 and newer. For example, `data:text/javascript;base64,Y29uc29sZS5sb2coMSk=?namespace=private` is not valid base64. A fragment leaves the payload unchanged because the processor excludes it.

## Loader implication

Loader metadata that must survive into imports from a `data:` module belongs in its fragment, not a query parameter. A `data:` module can import absolute URLs, so preserving the metadata is necessary for a hook to continue handling a TypeScript child module. Relative imports remain unsupported because `data:` is not a special URL scheme.
