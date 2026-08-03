# Benchmark

Measures tsx startup across **scenarios**, **Node versions**, and **project sizes**. Built to isolate where startup time goes — Node's floor, tsx's hook-registration tax, resolution, and transform — rather than one blended number. Motivated by [#809](https://github.com/privatenumber/tsx/issues/809).

## Usage

```sh
pnpm benchmark                                   # all scenarios, current Node, 1000 modules
pnpm benchmark esm-ts --compare 4.21.0           # one scenario vs a released version
pnpm benchmark hooks-passthrough --node 24.10.0  # async (worker) vs sync hooks (see below)
pnpm benchmark esm-ts --scale                    # per-module cost + fixed startup tax
pnpm benchmark esm-ts --cache-entries 10000      # warm lookup cost in a large cache
pnpm --silent benchmark --json > results.json    # raw per-run data
```

Positional arguments select scenarios (default: all).

For `--json`, use `pnpm --silent` so pnpm's script banner stays out of stdout and the redirected file is valid JSON (progress still goes to stderr).

## Scenarios

| Scenario | Default | Runs via | Isolates |
| --- | --- | --- | --- |
| `node-baseline` | ✅ | `node` | Absolute startup floor (ignores `--compare`) |
| `hooks-passthrough` | ✅ | tsx CLI | Hook registration + pass-through resolve/load, **zero transforms** |
| `esm-ts` | ✅ | tsx CLI | Transform + resolution hot path (`--specifier` applies) |
| `native-ts` | ✅ | `node` | Node's native type stripping — reference floor (ignores `--compare`) |
| `cjs-require` | | tsx CLI | The `tsx/cjs` require path |
| `cjs-interop` | | tsx CLI | ESM importing N CommonJS `node_modules` packages (the #809 surface) |

Running with no scenario names runs the **default set**; name any scenario (e.g. `pnpm benchmark cjs-interop`) to run it explicitly. All tsx scenarios run through the **tsx CLI** (not `--import`) for consistency with real usage; the CLI's extra Node spawn is constant across rows and visible against `node-baseline`.

### Why this default set

Chosen from a full sweep. The four defaults cover distinct, high-signal axes with no redundancy:

- `node-baseline` and `native-ts` are the Node floors needed to interpret the rest (native-ts also exposes tsx's transform surface as the gap above it).
- `hooks-passthrough` uniquely isolates the hook-registration / worker-thread tax (zero transforms).
- `esm-ts` carries the transform + resolution signal (and reproduces #809).

`cjs-require` barely varied across tsx versions (low discriminating signal) and `cjs-interop` correlated ~1.0 with `hooks-passthrough` at fixed size, so both are opt-in rather than default. They still exercise distinct code paths worth running deliberately.

## Flags

| Flag | Description | Default |
| --- | --- | --- |
| `-c, --compare` | tsx to compare: npm version or path to a tsx checkout (repeatable) | |
| `-n, --node` | Additional Node version to test, downloaded via get-node (repeatable) | current |
| `-m, --modules` | Module count (ignored with `--scale`) | `1000` |
| `-s, --specifier` | `esm-ts` import style: `ts`, `js`, `extensionless` | `ts` |
| `-r, --runs` | Timed runs per cell | `5` |
| `--cold` | Clear the tsx transform cache before every run | `false` |
| `--cache-entries` | Seed tsx scenarios with N unrelated cache entries | `0` |
| `--scale` | Sweep module counts 10/100/300/1000; report per-module cost + fixed tax | `false` |
| `--json` | Emit raw per-run results as JSON (stdout) | `false` |

Progress goes to stderr; result tables / JSON to stdout.

## Metrics

- **wall** — parent-measured spawn→exit; the headline, reported as mean ± stdev and **min**. Prefer min when comparing: run-to-run CV was ~6% median in the sweep, and min is the more stable statistic for startup timing.
- **rss** (`--json` only) — peak RSS (`resourceUsage().maxRSS`). Small spread across implementations; the one independent signal is the async loader worker's ~12MB overhead.
- **load / eval split** (`--json` only) — each module timestamps its first evaluation; since ESM evaluates post-order, the earliest ≈ "graph loaded/transformed" and the entry's last ≈ "graph evaluated". Eval was a negligible share on synthetic trees, so it's recorded in JSON but kept out of the table.

## Node version axis (async vs sync hooks)

tsx uses async `module.register()` (a loader **worker thread**) below the CJS-reload-safe boundary, and sync `module.registerHooks()` (in-thread) at or above it. The tsx selection policy is documented in [`notes/tsx/node-integration.md`](../../notes/tsx/node-integration.md#module-hooks), and the upstream boundary is in [`notes/node/module-hooks.md`](../../notes/node/module-hooks.md#cjs-reload-support). The cleanest same-major A/B is:

```sh
pnpm benchmark hooks-passthrough --node 24.10.0   # 24.10.0 = async worker, current (>=24.11.1) = sync
```

Scenarios below their `minNodeVersion` (e.g. `native-ts` under 22.18.0) are skipped, not failed.

## Reproducibility

The tsx transform cache is reset before each tsx scenario's warmup to avoid stale-file skew. Pass `--cache-entries` to instead create an isolated cache, seed it with unrelated entries, and retain it across warmup and timed runs. This mode measures cache initialization and warm lookup scaling without clearing or changing the user's cache. Node baseline scenarios are unaffected. Runs are interleaved after warmup.
