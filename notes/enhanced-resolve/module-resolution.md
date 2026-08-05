# Module resolution

enhanced-resolve defaults to `.js`, `.json`, and `.node` extensions without TypeScript substitution ([options](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/README.md#L323-L330)).

`extensionAlias` is ordered caller policy ([configuration](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/README.md#L373-L381)); the test order `'.js': ['.ts', '.js']` prefers TypeScript and falls back to JavaScript ([tests](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/test/extension-alias.test.js#L18-L48)).

Configured aliases run before normal exact-file resolution, so TypeScript-first alias order replaces an existing `.js` file ([pipeline](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/lib/ResolverFactory.js#L504-L519)). Alias/extension orders are resolver-global; resolve requests carry caller-supplied context, and custom plugins can inspect pipeline hooks ([context](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/lib/Resolver.js#L393-L410), [hooks](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/lib/Resolver.js#L550-L568)).

Package `imports` targets receive extension aliasing; `exports` targets remain exact unless `extensionAliasForExports` opts in ([imports pipeline](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/lib/ResolverFactory.js#L553-L576), [exports option](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/lib/ResolverFactory.js#L662-L692)).
