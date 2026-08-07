# Module resolution

esbuild tries an explicit path before extension candidates: `./value.js` resolves an existing `value.js` before TypeScript substitution, and falls back to `value.ts` only when the requested file is absent ([resolver](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/resolver/resolver.go#L1708-L1840)).

Implicit resolution is TypeScript-first locally and JavaScript-first inside `node_modules` ([regression test](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/bundler_tests/bundler_ts_test.go#L2688-L2720)); the dependency order avoids executing TypeScript source that a published package did not intend as runtime code ([0.18.0 rationale](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/CHANGELOG-2023.md#L2537-L2539)).

Known JavaScript output extensions use substitution, while `resolveExtensions` supplies appended candidates: an existing `asset.json` wins over `asset.json.js`, but a missing explicit asset can reach appended extensions ([`loadAsFile`](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/resolver/resolver.go#L1770-L1839)).
