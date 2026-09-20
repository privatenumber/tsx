# CJS default-import interop

Bun intentionally differs from Node for marked CommonJS default exports.

Bun v1.3.14 unwraps `exports.default` when `__esModule: true` is present, except when the CommonJS target is inside a `type: module` package scope. Its released tests lock both outcomes ([test matrix](https://github.com/oven-sh/bun/blob/bun-v1.3.14/test/js/bun/resolve/esModule-annotation.test.js#L11-L59)).

The runtime calls this a Babel-compatible interpretation and can suppress it with `ignoreESModuleAnnotation` ([implementation](https://github.com/oven-sh/bun/blob/bun-v1.3.14/src/jsc/bindings/JSCommonJSModule.cpp#L950-L1006)). The selector is the importee's package scope, not the importing file's module format, so it is not equivalent to Node, TypeScript, or esbuild policy.
