# CommonJS Register API

The CommonJS Register API allows you to manually register the enhancement at runtime. But note, this only affects CommonJS modules (`.cjs`/`.cts`, and `.js`/`.ts` when `package.json#type` is unset or `commonjs`).

## Usage
```js
const tsx = require('tsx/cjs/api')

// Register tsx enhancement
const unregister = tsx.register()

const loaded = require('./file.ts')

// Unregister when needed
unregister()
```

### Scoped registration

If you want to register without affecting the entire runtime environment, you can add a namespace.

When a namespace is provided, it will return a private `require()` method for you to load files with:
```js
const tsx = require('tsx/cjs/api')

const api = tsx.register({
    // Pass in a unique namespace
    namespace: Date.now().toString()
})

// Pass in the request and the current file path
const loaded = api.require('./file.ts', __filename)

api.unregister()
```
