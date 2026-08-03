# TypeScript research

TypeScript compiler and checker behavior. TypeScript resolves files for type information; it is not a JavaScript runtime resolver.

## Module resolution

Module resolution searches TypeScript, declaration, JavaScript, and, when enabled, JSON extensions independently of `allowJs` ([resolver extension masks](https://github.com/microsoft/TypeScript/blob/b465fdbfe175304d9b977da137b2c178ae1091d3/src/compiler/moduleNameResolver.ts#L1738-L1795)). The program builder later decides which discovered JavaScript files become program inputs ([filtering](https://github.com/microsoft/TypeScript/blob/b465fdbfe175304d9b977da137b2c178ae1091d3/src/compiler/program.ts#L3929-L3957)).

The resolver replaces known emitted extensions before it adds extension candidates. An explicit `./value.js` can resolve to `value.ts`, `value.tsx`, `value.d.ts`, then `value.js` ([candidate table](https://github.com/microsoft/TypeScript/blob/b465fdbfe175304d9b977da137b2c178ae1091d3/src/compiler/moduleNameResolver.ts#L2130-L2185)). In non-ESM modes, it can then append extensions to the original candidate ([resolution flow](https://github.com/microsoft/TypeScript/blob/b465fdbfe175304d9b977da137b2c178ae1091d3/src/compiler/moduleNameResolver.ts#L2064-L2105)).

For an explicit `.json` request without `resolveJsonModule`, TypeScript can progress to appended candidates such as `asset.json.js`. This is type-resolution behavior; the [compiler trace fixture](https://github.com/microsoft/TypeScript/blob/b465fdbfe175304d9b977da137b2c178ae1091d3/tests/baselines/reference/requireOfJsonFileWithoutResolveJsonModuleAndPathMapping.trace.json) records the candidate order.

TypeScript searches all ancestor `node_modules` directories for TypeScript and declaration files before starting a JavaScript fallback pass ([two-pass lookup](https://github.com/microsoft/TypeScript/blob/b465fdbfe175304d9b977da137b2c178ae1091d3/src/compiler/moduleNameResolver.ts#L2997-L3043)). This enables type discovery; it is not a runtime package-selection algorithm.

## Native type-stripping checker contract

`erasableSyntaxOnly` rejects TypeScript syntax that requires runtime transformation. `verbatimModuleSyntax` preserves runtime imports, `module: nodenext` models Node module classification, and `allowImportingTsExtensions` permits explicit TypeScript specifiers for type-check-only projects. TypeScript's [Node runtime guidance](https://www.typescriptlang.org/tsconfig/erasableSyntaxOnly.html) documents the checker-side contract.
