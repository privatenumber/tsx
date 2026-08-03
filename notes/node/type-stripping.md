# Native TypeScript type stripping

Node's built-in TypeScript execution pipeline and its runtime limits.

## Timeline

| Change | PR or issue | Verified releases |
| --- | --- | --- |
| `--experimental-transform-types` | [nodejs/node#54283](https://github.com/nodejs/node/pull/54283) | v22.7.0, v23.0.0 |
| `module.stripTypeScriptTypes()` | [#55282](https://github.com/nodejs/node/pull/55282), [nodejs/node#54300](https://github.com/nodejs/node/issues/54300) | v22.13.0, v23.2.0 |
| TypeScript in `--eval` and STDIN | [#56359](https://github.com/nodejs/node/pull/56359) | v22.14.0, v23.6.0, v24.0.0 |
| Default strip-only execution | [#56350](https://github.com/nodejs/node/pull/56350), [nodejs/typescript#17](https://github.com/nodejs/typescript/issues/17) | v22.18.0, v23.6.0, v24.0.0 |
| Stable status | [#60600](https://github.com/nodejs/node/pull/60600) | v24.12.0, v25.2.0 |
| Remove transform mode | [#61803](https://github.com/nodejs/node/pull/61803) | v26.0.0 |

## Runtime pipeline

- Node delegates stripping to Amaro. `amaro.transformSync` is loaded in [v24.0.0 `typescript.js#L47-L48`](https://github.com/nodejs/node/blob/v24.0.0/lib/internal/modules/typescript.js#L47-L48), and `processTypeScriptCode` owns the internal flow ([`typescript.js#L144`](https://github.com/nodejs/node/blob/v24.0.0/lib/internal/modules/typescript.js#L144)).
- ESM format detection maps `.ts` to TypeScript formats according to package type and syntax detection ([v24.0.0 `get_format.js#L133-L149`](https://github.com/nodejs/node/blob/v24.0.0/lib/internal/modules/esm/get_format.js#L133-L149)).
- The CJS loader strips TypeScript formats before compilation ([v24.0.0 `loader.js#L1125-L1127`](https://github.com/nodejs/node/blob/v24.0.0/lib/internal/modules/cjs/loader.js#L1125-L1127)).
- Stripping runs after the module-hook chain and before translation ([v24.15.0 `loader.js#L408-L414`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/esm/loader.js#L408-L414)).

## Public API and loader path

`node:module` exposes `stripTypeScriptTypes()`, but it differs from the loader path.

| Aspect | Public API | Internal loader |
| --- | --- | --- |
| `node_modules` | No restriction | Throws `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` ([v24.15.0 `typescript.js#L180-L183`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/typescript.js#L180-L183)) |
| Compile cache | Not used | Keyed by filename ([v24.15.0 `typescript.js#L198`](https://github.com/nodejs/node/blob/v24.15.0/lib/internal/modules/typescript.js#L198)) |
| Mode | Strip or transform through v25 | Strip only in v26 ([v26.4.0 `typescript.js#L101`](https://github.com/nodejs/node/blob/v26.4.0/lib/internal/modules/typescript.js#L101)) |

## Runtime limits

- Node ignores `tsconfig.json`; paths and downleveling are unsupported ([v26.0.0 `typescript.md#L80-L88`](https://github.com/nodejs/node/blob/v26.0.0/doc/api/typescript.md#L80-L88)).
- Relative TypeScript imports require explicit extensions ([v26.0.0 `typescript.md#L128-L136`](https://github.com/nodejs/node/blob/v26.0.0/doc/api/typescript.md#L128-L136)).
- `.tsx`, non-erasable syntax, TypeScript in `node_modules`, TypeScript data URLs, and extensionless TypeScript executables remain unsupported ([v26.0.0 `typescript.md#L128-L217`](https://github.com/nodejs/node/blob/v26.0.0/doc/api/typescript.md#L128-L217)).
