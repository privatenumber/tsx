# Source maps

Node caches source maps and maps its default error stack traces when source maps are enabled through `--enable-source-maps` or `process.setSourceMapsEnabled(true)` ([CLI contract](https://github.com/nodejs/node/blob/v20.16.0/doc/api/cli.md#L735-L759)).

## Custom stack formatting

Enabling source maps installs Node's source-map formatter as the internal stack formatter ([v20.16.0 setup](https://github.com/nodejs/node/blob/v20.16.0/lib/internal/source_map/source_map_cache.js#L55-L72)). Node calls a user-defined `Error.prepareStackTrace` before its internal formatter ([v20.16.0 error formatting](https://github.com/nodejs/node/blob/v20.16.0/lib/internal/errors.js#L132-L157)), so custom formatters receive `CallSite` locations from generated code. Node's default formatter does not map a stack trace that the custom formatter returns.

Node documents that overriding `Error.prepareStackTrace` can prevent source-map stack formatting and shows a delegation pattern that captures and returns the original formatter ([CLI contract](https://github.com/nodejs/node/blob/v20.16.0/doc/api/cli.md#L743-L755)).

## Structured locations

Custom formatters that need original locations can look up the generated file URL with `module.findSourceMap()` and map each 1-indexed `CallSite` line and column with `sourceMap.findOrigin()` ([v20.16.0 API](https://github.com/nodejs/node/blob/v20.16.0/doc/api/module.md#L999-L1015), [`findOrigin()` contract](https://github.com/nodejs/node/blob/v20.16.0/doc/api/module.md#L1074-L1104)).

```js
import { findSourceMap } from 'node:module'

const fileName = callSite.getFileName()
const location = fileName && findSourceMap(fileName)?.findOrigin(
    callSite.getLineNumber(),
    callSite.getColumnNumber()
)
```

`findSourceMap()` was added in Node v12.17.0 and v13.7.0 ([v20.16.0 API history](https://github.com/nodejs/node/blob/v20.16.0/doc/api/module.md#L999-L1005)). `findOrigin()` is available from Node v18.18.0 and v20.4.0 ([v18.18.0 implementation](https://github.com/nodejs/node/blob/v18.18.0/lib/internal/source_map/source_map.js#L208-L218), [v20.4.0 implementation](https://github.com/nodejs/node/blob/v20.4.0/lib/internal/source_map/source_map.js#L208-L218)).
