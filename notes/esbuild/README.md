# esbuild research

esbuild resolver and transform behavior relevant to direct TypeScript execution.

## Module resolution

esbuild tries an explicit path before extension candidates. When both `value.js` and `value.ts` exist, an explicit `./value.js` resolves `value.js`. If `value.js` is absent, esbuild can fall back to `value.ts` through its TypeScript extension substitution ([resolver](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/resolver/resolver.go#L1708-L1840)).

For implicit candidates inside `node_modules`, esbuild prefers JavaScript over TypeScript. Its [regression test](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/bundler_tests/bundler_ts_test.go#L2688-L2720) locks the local TypeScript-first and dependency JavaScript-first difference. The [0.18.0 release notes](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/CHANGELOG-2023.md#L2428-L2442) explain that published packages can contain TypeScript that is not intended to execute.

esbuild distinguishes extension substitution from extension addition. It maps known JavaScript output extensions to TypeScript source extensions, while `resolveExtensions` handles appended candidates. An explicit `asset.json` wins over `asset.json.js` when it exists; a missing explicit asset can reach appended candidates ([`loadAsFile`](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/resolver/resolver.go#L1770-L1839)).

## CJS export annotation output

esbuild emits a dead-code `module.exports` annotation for certain transformed CommonJS export shapes. The annotation does not execute, but static CJS export lexers can recognize it ([CommonJS linker output](https://github.com/evanw/esbuild/blob/6ff1d8b0d8c134e867a397eef39702a223ebef9e/internal/linker/linker.go#L5065-L5127)). This output shape is relevant to consumers that construct CJS namespaces from source text.
