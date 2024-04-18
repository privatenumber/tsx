---
outline: deep
---

# Watch mode

Watch mode runs the file and automatically re-runs it when the file is changed.

```sh
tsx watch ./file.ts
```

::: info Context

tsx introduced _Watch mode_ at a time when Node.js lacked this feature. Node.js introduced their watch mode (`--watch` flag) in [v18.11.0](https://github.com/nodejs/node/releases/tag/v18.11.0).

While it would be preferrable to remove tsx's watch mode in favor of Node's, it does not yet match the functionality and robustness of tsx's Watch mode.
:::

## Watch behavior

All imported files are watched except from the following directories:
`node_modules`, `bower_components`, `vendor`, `dist`, and `.*` (hidden directories).

#### Ignore files from watch

To exclude files from being watched, pass in a path or glob to the `--ignore` flag:
```sh
tsx watch --ignore ./ignore-me.js --ignore ./ignore-me-too.js ./file.ts
```

#### Tips
- Press <kbd>Return</kbd> to manually rerun
- Pass in `--clear-screen=false` to disable clearing the screen on rerun
