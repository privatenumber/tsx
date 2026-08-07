# Import elision

Bun 1.3.14 lowers every non-`declare` qualified import-equals declaration to a JavaScript local initialized from the qualified property access; the parser does not classify later type-only references before creating that initializer ([parser](https://github.com/oven-sh/bun/blob/0d9b296af33f2b851fcbf4df3e9ec89751734ba4/src/js_parser/ast/parseTypescript.zig#L309-L358)).

The conformance suite runs the tree-shaking-disabled case while elimination, tree-shaking-enabled elimination, and bundled elimination remain `todo` ([tests](https://github.com/oven-sh/bun/blob/0d9b296af33f2b851fcbf4df3e9ec89751734ba4/test/bundler/esbuild/ts.test.ts#L715-L789)); Bun therefore has no pinned contract for erasing a type-only qualified alias or its originating import.
