# Frequently Asked Questions

## How can I do __ in _tsx_?

It's important to remember that `tsx` is a Node.js enhancement—it's still Node underneath.

That said, often times you might want to ask and lookup the following instead:
- _"How can I do __ in Node.js?"_
- _"How can I do __ in TypeScript?"_


## Who uses _tsx_?

_tsx_ currently gets <a href="https://npm.im/tsx"><img class="inline-block" src="https://badgen.net/npm/dm/tsx"></a> and is used by many projects.

Here are some notable ones I've found via [GitHub Search](https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22&type=code):

### Projects
- [Vite](https://github.com/vitejs/vite/blob/6cccef78a52492c24d9b28f3a1784824f34f5cc3/package.json#L83)
- [Vue.js](https://github.com/vuejs/core/blob/70641fc0deb857464d24aa7ab7eaa18e2a855146/package.json#L110)
- [Mermaid](https://github.com/mermaid-js/mermaid/blob/3809732e48a0822fad596d0815a6dc0e166dda94/package.json#L121)
- [date-fns](https://github.com/date-fns/date-fns/blob/5c1adb5369805ff552737bf8017dbe07f559b0c6/package.json#L6123)
- [Cheerio](https://github.com/cheeriojs/cheerio/blob/d0b3c2f6b57cd1f835741175d463963266be0eef/package.json#L99)

### Companies
- Vercel: [Turbo](https://github.com/vercel/turbo/blob/adbfe4c04e3cdd31ae1916d0a5222bbc5ae2bb58/packages/turbo-repository/package.json#L20), [Serve](https://github.com/vercel/serve/blob/1ea55b1b5004f468159b54775e4fb3090fedbb2b/package.json#L61), [AI](https://github.com/vercel/ai/blob/e94fb321645bfff7ecc78bb195ccd34af1a40c74/examples/ai-core/package.json#L20)
- Google: [Angular](https://github.com/angular/angular/blob/a34267b72e8994d22d47c73d45f22173304939a0/package.json#L144), [\[1\]](https://github.com/google/neuroglancer/blob/d5cc03520b24ef1c66d7fb6b3a3b49eebe87bd44/package.json#L69), [\[2\]](https://github.com/google/labs-prototypes/blob/93a0fba516d95e4fc7063b9c38d1074f69322d2d/seeds/team-experiments/package.json#L25)
- GitHub: [\[1\]](https://github.com/github/docs/blob/d183c8519bb08678150e7c4b45c50fb314a2d145/package.json#L273), [\[2\]](https://github.com/github/local-action/blob/a93157e99d69c563c0368bb8fd2a3c6f5c6795ea/package.json#L53)
- Square (internal projects)
- Supabase: [Supabase](https://github.com/supabase/supabase/blob/34d152ce7832a1313f06012612480b9717742f73/apps/docs/package.json#L101), [\[1\]](https://github.com/supabase/stripe-sync-engine/blob/01ab4093d31fad974d85d78c52b4130779dc0eeb/package.json#L55), [\[2\]](https://github.com/supabase/storage/blob/2adeac7ddb41522df3ee30b8d4cf9071426bbe5f/package.json#L103), [\[3\]](https://github.com/supabase/orb-sync-engine/blob/e3249cca02c3a7f3b385fdd9ea1f72d5eb55fb05/apps/node-fastify/package.json#L27)
- Astro: [Compiler](https://github.com/withastro/compiler/blob/17f89322a5604542735b13fdedd2664253f1e8f8/package.json#L35), [Starlight](https://github.com/withastro/starlight/blob/b2c50ea1da1aaefd1f0f08dd2f501c8dc4f04726/packages/file-icons-generator/package.json#L12), [\[1\]](https://github.com/withastro/language-tools/blob/0503392b80765c8a1292ddc9c063a1187425c187/packages/astro-check/package.json#L38)



## How does _tsx_ compare to [`ts-node`](https://github.com/TypeStrong/ts-node)?

`tsx` and `ts-node` are both designed for executing TypeScript in Node.js, but offer different approaches to suit user preferences.

- **Simple installation**

	_tsx_ is offered as a single binary without peer dependencies, and can be used without installation (just run `npx tsx ./script.ts`). In comparison, `ts-node` requires installing TypeScript or SWC as peer dependencies.

- **Zero configuration**

	_tsx_ _just works_. It doesn't require initial setup or a `tsconfig.json` file, and doesn't get in the way of running your code. This is especially important for beginners getting into TypeScript!

- **Sensible defaults**

	_tsx_ employs sensible defaults based on file imports and the Node.js version, removing the need for certain `tsconfig.json` settings (that are designed for compilation rather than runtime). In comparison, _ts-node_ relies on TypeScript's defaults (e.g. [`ES3` target](https://www.typescriptlang.org/tsconfig#target)), which may be outdated.

- **Module adaptability**

	_tsx_ automatically adapts between CommonJS and ESM modules, even supporting `require()` of ESM modules, facilitating a smoother transition as the Node.js ecosystem evolves.

- **Enhancements**

	_tsx_ gracefully handles [new JS & TS syntax](https://esbuild.github.io/content-types/) and features based on the Node.js version. It also supports [`tsconfig.json` paths](https://www.typescriptlang.org/tsconfig#paths) out of the box.

- **Speed**

	_tsx_ utilizes [esbuild](https://esbuild.github.io/faq/#:~:text=typescript%20benchmark) for rapid TypeScript compilation. In comparison, _ts-node_ uses the TypeScript compiler by default. Because _tsx_ doesn't type check, it's similar to `ts-node --esm --swc` (which uses the [SWC compiler](https://github.com/TypeStrong/ts-node#swc-1)).

- **Watcher**

	As a DX bonus, _tsx_ also comes with [Watch mode](/watch-mode.md) to help you iterate faster!

For a detailed technical comparison, you can refer to this [exhaustive comparison](https://github.com/privatenumber/ts-runtime-comparison) between `tsx`, `ts-node`, and other runtimes.


## Can/should it be used in production?

At the end of the day, this is something you'll have to evaluate yourself against your production needs and risk tolerance.

Some factors you might want to consider are:

- _tsx_ is Node.js enhanced, so you can expect similar levels of stability.

- _tsx_ uses [esbuild](https://esbuild.github.io) to transform TypeScript and ESM, and esbuild hasn't reached a stable release yet.


Some questions you might want to ask yourself are:

- What are the benefits vs costs of using `tsx` in production?
	- Are there performance costs?

- Does `tsx` run my code expectedly? Are there different environments and tools being used between dev and production?

- Can I rely on this open source project and the maintainers?

## Can't find your question?

Try searching or asking in [GitHub Discussions](https://github.com/privatenumber/tsx/discussions)!
