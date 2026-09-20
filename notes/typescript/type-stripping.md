# Native type-stripping checker contract

`erasableSyntaxOnly` rejects syntax that requires JavaScript generation, including import-equals declarations ([checker](https://github.com/microsoft/TypeScript/blob/637d5746b70257028fb95aad32ddec6b26ab0a14/src/compiler/checker.ts#L48709-L48718)); `verbatimModuleSyntax` preserves non-`type` imports and makes import/export intent explicit instead of applying legacy inferred elision ([emit predicate](https://github.com/microsoft/TypeScript/blob/637d5746b70257028fb95aad32ddec6b26ab0a14/src/compiler/transformers/ts.ts#L2747-L2749)).

`transpileModule()` forces `noCheck`, so its output does not prove that semantic diagnostic TS1294 from `erasableSyntaxOnly` was enforced ([transpile options](https://github.com/microsoft/TypeScript/blob/637d5746b70257028fb95aad32ddec6b26ab0a14/src/services/transpile.ts#L50-L66)).

`module: nodenext` selects Node's module mode ([module option](https://github.com/microsoft/TypeScript/blob/637d5746b70257028fb95aad32ddec6b26ab0a14/src/compiler/commandLineParser.ts#L605-L635)); `allowImportingTsExtensions` requires `noEmit`, `emitDeclarationOnly`, or `rewriteRelativeImportExtensions` ([validation](https://github.com/microsoft/TypeScript/blob/637d5746b70257028fb95aad32ddec6b26ab0a14/src/compiler/program.ts#L4354-L4355)).
