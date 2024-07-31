# Entry-point

Import `tsx` at the top of your entry-file:
```js
import 'tsx'

// Now you can load TS files
await import('./file.ts')
```
<!-- TODO: does this work in CJS mode? -->

Note, because of the order of static import evaluatation in ESM, the enhancement only works on [dynamic imports after registeration](https://nodejs.org/docs/latest-v22.x/api/module.html#:~:text=dynamic%20import()%20must%20be%20used%20for%20any%20code%20that%20should%20be%20run%20after%20the%20hooks%20are%20registered).

::: danger
Enhancing Node.js by loading _tsx_ from within your source code at run-time can be unexpected for collaborators who aren’t aware of it.

When possible, it's recommended to use a more visible method, such as passing it as a [CLI flag](/dev-api/node-cli).
:::


## Advanced usage

### CommonJS mode only

Require `tsx/cjs` at the top of your entry-file:

```js
require('tsx/cjs')

// Now you can load TS files
require('./file.ts')
```

### Module mode only

Import `tsx/esm` at the top of your entry-file:

```js
import 'tsx/esm'

// Now you can load TS files
await import('./file.ts')
```
