# esbuild research

esbuild resolver and transform behavior relevant to direct TypeScript execution.

| File | Covers |
| --- | --- |
| [module-resolution.md](./module-resolution.md) | Exact paths, extension substitution, and dependency ordering |
| [cjs-esm-interop.md](./cjs-esm-interop.md) | `__toESM` Node-mode and Babel-compatible default imports |
| [import-elision.md](./import-elision.md) | TypeScript import-equals analysis and retained imports |
| [function-identity.md](./function-identity.md) | `keepNames`, final renaming, and serialized functions |
| [commonjs-output.md](./commonjs-output.md) | Static CommonJS export annotations |
