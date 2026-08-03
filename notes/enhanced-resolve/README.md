# enhanced-resolve research

webpack enhanced-resolve configuration behavior relevant to TypeScript extension aliases.

## Extension aliases

enhanced-resolve does not substitute TypeScript extensions by default. Its default extensions are `.js`, `.json`, and `.node` ([resolver options](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/README.md)).

`extensionAlias` is an explicit opt-in policy. Candidate order determines precedence: `'.js': ['.ts', '.js']` prefers TypeScript, while `'.js': ['.js', '.ts']` preserves the requested JavaScript file first ([implementation](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/lib/ExtensionAliasPlugin.js), [tests](https://github.com/webpack/enhanced-resolve/blob/aefeac310a824190502425fc89f0b72d0237dd18/test/extension-alias.test.js)).
