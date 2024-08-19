# Watch mode

::: warning Not to be confused with [Node's Watch mode](https://nodejs.org/docs/latest/api/cli.html#--watch)
_tsx_ introduced _Watch mode_ before Node.js released the `--watch` flag in [v18.11.0](https://github.com/nodejs/node/releases/tag/v18.11.0). Although it is similar in functionality, it does not yet match the robustness of _tsx_'s Watch mode.
:::

## Overview

Watch mode will automatically re-run your script whenever any of its dependencies are changed.

```sh
tsx watch ./file.ts
```

## Watch behavior

By default, _tsx_ watches all imported files, except those in the following directories:
- `node_modules`
- `bower_components`
- `vendor`
- `dist`
- Hidden directories (`.*`)

## Ignoring files

To exclude specific files or directories from being watched, use the `--ignore` flag:

```sh
tsx watch --ignore ./ignore-me.js --ignore ./ignore-me-too.js ./file.ts
```

### Using glob patterns

Glob patterns allow you to define a set of files or directories to ignore. To prevent your shell from expanding the glob patterns, wrap them in quotes:

```sh
tsx watch --ignore "./data/**/*" ./file.ts
```

## Tips

- Press <kbd>Return</kbd> to manually rerun the script. Use `--clear-screen=false` to prevent the screen from clearing on rerun.
- Use `--clear-screen=false` to prevent the screen from clearing on rerun.
