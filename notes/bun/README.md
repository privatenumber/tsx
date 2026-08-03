# Bun research

Bun runtime module-resolution behavior relevant to TypeScript source execution.

## Module resolution

Bun checks an explicit import path first. If that path is missing, it can try appended extensions and TypeScript-compatible substitutions. An import of `./value.js` therefore loads `value.js` when present and can fall back to a matching TypeScript file when it is absent ([runtime resolver](https://github.com/oven-sh/bun/blob/506945ef46dced9de326adb9655b02931e66d0a7/docs/runtime/module-resolution.mdx)).

For imports inside `node_modules`, Bun prefers JavaScript extensions over TypeScript extensions. Bun introduced that ordering because dependencies can ship TypeScript source that is not runnable by the consumer's toolchain ([v1.0.14 rationale](https://bun.com/blog/bun-v1.0.14#typescript-module-resolution-changes-in-node_modules)).
