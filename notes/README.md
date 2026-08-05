# Engineering research notes

Tracked maintainer references for the tools and runtime contracts that shape tsx. These files are not published in the npm package.

## Ownership

Each `notes/<tool>/` folder records research about that tool alone. It may describe its own implementation, configuration, version boundaries, and observable behavior. Do not put tsx policy, comparisons, or implementation decisions in a tool-owned folder.

`notes/tsx/` owns cross-tool synthesis: tsx behavior, policy decisions, compatibility boundaries, test matrices, and integration maps. It links to tool-owned evidence instead of duplicating it.

Use `README.md` as a short folder index. When tools have evidence for the same domain, use the same domain filename, such as `module-resolution.md`, `import-elision.md`, or `function-identity.md`; do not create empty parity files without source-backed claims.

Create a tool folder when the repository makes independent, reusable claims about that tool. Incidental dependencies do not need a folder when they only explain an owning tool's implementation. For example, a Node note may say that Node delegates type stripping to Amaro; independent Amaro behavior belongs in `notes/amaro/` if it is researched.

## Index

| Folder | Owns |
| --- | --- |
| [node/](./node/README.md) | Node runtime and loader behavior |
| [typescript/](./typescript/README.md) | TypeScript compiler and checker behavior |
| [esbuild/](./esbuild/README.md) | esbuild resolver and transform behavior |
| [bun/](./bun/README.md) | Bun runtime resolver and TypeScript transform coverage |
| [enhanced-resolve/](./enhanced-resolve/README.md) | webpack enhanced-resolve configuration behavior |
| [oxc-resolver/](./oxc-resolver/README.md) | oxc-resolver configuration behavior |
| [oxc-transform/](./oxc-transform/README.md) | Oxc TypeScript transformation and generated-helper behavior |
| [tsx/](./tsx/README.md) | tsx policy, integration, and cross-tool synthesis |

## Evidence

- Cite public primary sources. Prefer immutable release tags or commit SHAs with line anchors over moving branches.
- Distinguish observed facts from an inference or a tsx decision. Link the source that supports each fact.
- Keep current-system notes self-contained. Put historical change narratives in a tool's implementation-history section only when they explain a current constraint.
- Put executable contracts in `tests/`; notes explain the source evidence, ownership, and maintenance intent.

## Maintenance

When updating an upstream behavior, verify the cited version boundary from that tool's source and release history. Update tsx policy only after the source evidence and a behavior-level test agree.
