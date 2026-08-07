# Native TypeScript type stripping

Node's built-in TypeScript execution pipeline and its runtime limits.

## Timeline

| Change | PR or issue | Verified releases |
| --- | --- | --- |
| `--experimental-strip-types` | [nodejs/node#53725](https://github.com/nodejs/node/pull/53725) | v22.6.0, v23.0.0 |
| `--experimental-transform-types` | [nodejs/node#54283](https://github.com/nodejs/node/pull/54283) | v22.7.0, v23.0.0 |
| `module.stripTypeScriptTypes()` | [#55282](https://github.com/nodejs/node/pull/55282), [nodejs/node#54300](https://github.com/nodejs/node/issues/54300) | v22.13.0, v23.2.0 |
| TypeScript in `--eval` and STDIN | [#56359](https://github.com/nodejs/node/pull/56359) | v22.14.0, v23.6.0, v24.0.0 |
| Default strip-only execution | [#56350](https://github.com/nodejs/node/pull/56350), [nodejs/typescript#17](https://github.com/nodejs/typescript/issues/17) | v22.18.0, v23.6.0, v24.0.0 |
| Stable status | [#60600](https://github.com/nodejs/node/pull/60600) | v24.12.0, v25.2.0 |
| Remove transform mode | [#61803](https://github.com/nodejs/node/pull/61803) | v26.0.0 |

## Runtime pipeline

- Node delegates stripping to Amaro. `amaro.transformSync` is loaded in [v24.0.0 `typescript.js#L47-L48`](https://github.com/nodejs/node/blob/v24.0.0/lib/internal/modules/typescript.js#L47-L48), and `processTypeScriptCode` owns the internal flow ([`typescript.js#L144`](https://github.com/nodejs/node/blob/v24.0.0/lib/internal/modules/typescript.js#L144)).
- ESM format detection maps `.ts` to TypeScript formats according to package type and syntax detection ([v24.0.0 `get_format.js#L133-L149`](https://github.com/nodejs/node/blob/v24.0.0/lib/internal/modules/esm/get_format.js#L133-L149)).
- The CJS loader strips TypeScript formats before compilation ([v24.0.0 `loader.js#L1684-L1686`](https://github.com/nodejs/node/blob/v24.0.0/lib/internal/modules/cjs/loader.js#L1684-L1686)).
- ESM load hooks supply source before translator selection ([v24.15.0 `loader.js#L503-L512`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/loader.js#L503-L512)); TypeScript translators then strip that source before delegating to the ordinary module/CommonJS translator ([v24.15.0 `translators.js#L627-L642`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/translators.js#L627-L642)).

## Public API and loader path

`node:module` exposes `stripTypeScriptTypes()`, but it differs from the loader path.

| Aspect | Public API | Internal loader |
| --- | --- | --- |
| `node_modules` | No path restriction ([v24.15.0 `typescript.js#L102-L127`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/typescript.js#L102-L127)) | Throws `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` ([v24.15.0 `typescript.js#L180-L183`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/typescript.js#L180-L183)) |
| Compile cache | Not used ([public path](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/typescript.js#L102-L127)) | Keyed by filename ([v24.15.0 `typescript.js#L198`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/typescript.js#L198)) |
| Transform mode | Public `mode: "transform"` available through v25 ([v25 API](https://github.com/nodejs/node/blob/v25.9.0/lib/internal/modules/typescript.js#L102-L127)); removed in v26 ([v26 API](https://github.com/nodejs/node/blob/v26.3.1/lib/internal/modules/typescript.js#L93-L116)) | Loader mode followed the runtime flag through v25 ([v25 loader](https://github.com/nodejs/node/blob/v25.9.0/lib/internal/modules/typescript.js#L180-L188)); transform mode was removed in v26 ([release](https://github.com/nodejs/node/blob/v26.3.1/doc/changelogs/CHANGELOG_V26.md#L753-L763)) |

## Position preservation

Strip mode replaces erasable syntax with whitespace, preserving source length and line/column offsets; `sourceUrl` appends a `sourceURL` comment, while `sourceMap: true` is invalid in strip mode ([v24 tests](https://github.com/nodejs/node/blob/v24.18.0/test/parallel/test-module-strip-types.js#L21-L53), [v26 tests](https://github.com/nodejs/node/blob/v26.3.1/test/parallel/test-module-strip-types.js#L14-L46)). Direct loader execution therefore reports original locations without generated source maps ([stack test](https://github.com/nodejs/node/blob/v24.18.0/test/es-module/test-typescript.mjs#L170-L177)).

The public helper permits caught fallback and accepts an arbitrary `sourceUrl`; the internal loader strips only after format selection and cannot return to an earlier user hook when syntax is unsupported ([ESM translator](https://github.com/nodejs/node/blob/v24.18.0/lib/internal/modules/esm/translators.js#L666-L681), [CJS loader](https://github.com/nodejs/node/blob/v24.18.0/lib/internal/modules/cjs/loader.js#L1814-L1845)).

## Runtime limits

- Node ignores `tsconfig.json`; paths and downleveling are unsupported ([v26.0.0 `typescript.md#L80-L88`](https://github.com/nodejs/node/blob/v26.0.0/doc/api/typescript.md#L80-L88)).
- Relative TypeScript imports require explicit extensions ([v26.0.0 `typescript.md#L128-L136`](https://github.com/nodejs/node/blob/v26.0.0/doc/api/typescript.md#L128-L136)).
- `.tsx`, non-erasable syntax, and TypeScript in `node_modules` remain unsupported ([v26.0.0 `typescript.md#L128-L217`](https://github.com/nodejs/node/blob/v26.0.0/doc/api/typescript.md#L128-L217)).
- Import aliases such as `import Alias = Namespace.Member` require JavaScript generation and fail strip-only execution with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` ([v26.5.1 `typescript.md#L140-L162`](https://github.com/nodejs/node/blob/v26.5.1/doc/api/typescript.md#L140-L162)).
- TypeScript data URLs remain unsupported because the data-protocol handler maps its MIME type through a table that recognizes JavaScript, JSON, and WebAssembly but not TypeScript ([v26.0.0 handler](https://github.com/nodejs/node/blob/v26.0.0/lib/internal/modules/esm/get_format.js#L98-L104), [MIME table](https://github.com/nodejs/node/blob/v26.0.0/lib/internal/modules/esm/get_format.js#L38-L50)).
- As of v26.5.1, the CJS extension hook selects TypeScript formats only for `.mts`, `.cts`, and `.ts`; extensionless entrypoints receive JavaScript package formats instead ([loader](https://github.com/nodejs/node/blob/v26.5.1/lib/internal/modules/cjs/loader.js#L2043-L2066)).
