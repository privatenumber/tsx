# Compatibility Test Routing

This directory is a routing note and future split point for capability and strategy compatibility tests. It does not reorganize current tests, add runner wiring, or move coverage out of the existing specs.

Until the compatibility suite is wired, keep executable tests in the narrowest existing spec and update this note when a new compatibility domain appears.

## Current Domains

| Domain | Current route | Notes |
| --- | --- | --- |
| `registerHooks` composition | `tests/specs/version-sensitive.ts` | Use for Node loader hook composition that depends on newer `node:module` support. |
| Watch and CLI Node-version behavior | `tests/specs/version-sensitive.ts`, `tests/specs/watch.ts`, `tests/specs/cli.ts` | Keep stable command behavior in `watch.ts` or `cli.ts`; use `version-sensitive.ts` for matrix-specific behavior. |
| CommonJS-classified TypeScript contracts | `tests/specs/version-sensitive.ts`, `tests/specs/commonjs-mode-contracts.ts` | Use `version-sensitive.ts` for Node-dependent ESM import and `tsImport` contracts; use `commonjs-mode-contracts.ts` for omitted `type` versus explicit `commonjs` equivalence. |
| CJS namespace and `require(esm)` behavior | `tests/specs/version-sensitive.ts` | Use for namespace shape, `module.exports` interop, and extensionless `.mjs` resolution across Node versions. |
| Path encoding and query resolution | `tests/specs/version-sensitive.ts`, `tests/specs/smoke.ts`, `tests/specs/api.ts` | Use for literal question marks, query strings, namespace query parameters, and path alias query resolution. |
| `import.meta` path properties | `tests/specs/version-sensitive.ts` | Use for Node file-module support such as `import.meta.dirname` and `import.meta.filename`. |
| Package `main` resolution | `tests/specs/version-sensitive.ts`, `tests/specs/commonjs-mode-contracts.ts` | Use `version-sensitive.ts` for Node-version boundaries and `commonjs-mode-contracts.ts` for CommonJS mode parity. |
| Node test runner behavior | `tests/specs/version-sensitive.ts`, `tests/specs/cli.ts` | Keep the baseline `--test` CLI contract in `cli.ts`; use `version-sensitive.ts` for Node-version output or glob differences. |

## Routing Rule

New compatibility tests should start in the current route for their domain. Add executable specs under `tests/specs/compat/` only when the runner has an intentional compatibility suite boundary, so this directory stays a taxonomy skeleton instead of an accidental test reorganization.
