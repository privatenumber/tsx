# oxc-resolver research

oxc-resolver configuration behavior relevant to TypeScript extension aliases.

## Extension aliases

oxc-resolver aligns its resolver options with enhanced-resolve. It defaults to `.js`, `.json`, and `.node` extensions and no `extensionAlias` configuration ([defaults](https://github.com/oxc-project/oxc-resolver/blob/51a7ef0ad9c6258d645222c59cda217ca35b32c0/src/options.rs)).

`extensionAlias` is opt-in and ordered. The resolver test configures `'.js': ['.ts', '.js']`, demonstrating that TypeScript-first behavior is a caller-selected policy rather than a default ([test](https://github.com/oxc-project/oxc-resolver/blob/51a7ef0ad9c6258d645222c59cda217ca35b32c0/src/tests/extension_alias.rs)).
