# Node.js research

Node runtime and loader implementation references. These notes record Node behavior and version boundaries only.

## Reading order

| File | Covers |
| --- | --- |
| [module-hooks.md](./module-hooks.md) | Async `module.register()` and sync `module.registerHooks()` |
| [module-resolution.md](./module-resolution.md) | ESM root exports, CommonJS directory mains, and ESM error decoration |
| [data-url-modules.md](./data-url-modules.md) | `data:` module payload and metadata behavior |
| [source-maps.md](./source-maps.md) | Stack formatting and `CallSite` source-map locations |
| [cjs-loader.md](./cjs-loader.md) | CommonJS resolution, cache identity, extensions, and ESM error decoration |
| [cjs-esm-interop.md](./cjs-esm-interop.md) | Node's CJS-to-ESM and ESM-to-CJS interoperability |
| [type-stripping.md](./type-stripping.md) | Node's native TypeScript type-stripping runtime |
| [feature-boundaries.md](./feature-boundaries.md) | Smaller Node feature and bug-fix boundaries |

## Verification workflow

Version boundaries are pinned from Node git history because backports can land after the main-line commit.

```text
cd /path/to/nodejs/node
git fetch --tags

# Every commit carrying a PR-URL trailer = main-line commit + all backport
# cherry-picks. Collect all release tags containing them, first per major line:
pr=59929
{ for sha in $(git log --grep "PR-URL: https://github.com/nodejs/node/pull/${pr}\$" --format=%H --all); do
    git tag --contains "$sha" | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$'
  done; } | sort -u -V | awk -F. '{maj=$1} maj!=prev{print; prev=maj}'
```

After finding a boundary, verify the source shape with `git show <tag>:<path>` and cite the matching tagged GitHub URL. A PR can fix a feature after it shipped, and a backport can be narrower than the main-line implementation.
