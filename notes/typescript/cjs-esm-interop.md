# CJS default-import interop

How TypeScript selects Babel-style or Node-style default imports from CommonJS.

## CommonJS emit

When TypeScript lowers an importing module to CommonJS, its interop helper uses `__esModule` to distinguish compiler-produced CommonJS from ordinary CommonJS. A marked module supplies its `.default` property; an unmarked module supplies its complete `module.exports` value ([interop design](https://github.com/microsoft/TypeScript-Website/blob/52338d5c88ceae1ab930a1e9d078368b4d27cb22/packages/documentation/copy/en/modules-reference/appendices/ESM-CJS-Interop.md?plain=1#L129-L149)). This preserves a source-level ESM default import when both importer and importee have been compiled to CommonJS.

`__esModule` is a compiler convention, not standardized runtime metadata. A hand-written CommonJS module can have the same shape as compiler output, so this helper is a transformation policy rather than proof of the module author's intent.

## Node-aware ESM emit

`node16`, `node18`, `node20`, and `nodenext` select each source file's output format from its extension and nearest `package.json#type` ([format detection](https://github.com/microsoft/TypeScript-Website/blob/e5652f43f20bf13a1671051de4dbf67eac73d6e1/packages/documentation/copy/en/modules-reference/Reference.md?plain=1#L218-L238)). ESM output preserves the import and delegates CommonJS interop to Node, which binds the complete `module.exports` value as the default import.

`esModuleInterop` changes CommonJS emit and type checking. It cannot alter an import that TypeScript leaves as native ESM.
