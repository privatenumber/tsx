# What is _tsx_?

`tsx` stands for _TypeScript Execute_, and it's a simple command to run TypeScript in Node.js.

Because `tsx` is basically an alias to `node`, you can use it the same way:

<div class="tsx-before-after">

```sh
node file.js
```
<span class="hidden sm:block">→</span>
<span class="sm:hidden">↓</span>
```sh
tsx file.js
```
</div>

<sub>Since it's Node.js underneath, all command-line flags are supported. Use `tsx` as you would use `node`!</sub>

## Features

### No hassle TypeScript runner

- _Just run_ [TypeScript](https://www.typescriptlang.org/) code. No configuration required!

	The primary goal of _tsx_ is to run TypeScript code with modern and sensible defaults. This makes _tsx_ very user-friendly and great for beginners!

	<!-- There's also no configuration specifically for _tsx_. Instead, you configure Node.js (via `package.json`) and TypeScript (via `tsconfig.json`). -->

### CJS ↔ ESM interop

- Seamlessly cross-import CommonJS and ES Modules!

	If you've encountered the following error in Node, you'll never see it again with _tsx_!

	```
	Error [ERR_REQUIRE_ESM]: require() of ES Module <ESM package> from ./file.js not supported.
	Instead change the require of <ESM package> in ./file.js to a dynamic import() which is available in all CommonJS modules.
	```

	<sub>This happens in Node.js when importing an ESM file from CommonJS, which can happen in new dependencies.</sub>

### Watch mode

- Iterate on your code faster and boost productivity!

	As a DX bonus, _tsx_ comes with a [watcher](./watch-mode.md) to re-run your files whenever you save them.

## Limitations

TypeScript & ESM transformations are handled by [esbuild](https://esbuild.github.io/), so it shares some of the same limitations such as:

- Compatibility with `eval()` is not preserved
- Only [certain `tsconfig.json` properties](https://esbuild.github.io/content-types/#tsconfig-json) are supported
	- [`emitDecoratorMetadata`](https://www.typescriptlang.org/tsconfig#emitDecoratorMetadata) is not supported

For details, see esbuild's [JavaScript caveats](https://esbuild.github.io/content-types/#javascript-caveats) and [TypeScript caveats](https://esbuild.github.io/content-types/#typescript-caveats) documentation.


<style scoped>
.tsx-before-after {
	@apply
		flex
		justify-between
		gap-4
		items-center
		flex-wrap
		sm:flex-nowrap;

	> * {
		@apply
			w-full
			text-center
			m-0;
	}

	> p {
		@apply sm:w-auto;
	}
}
</style>
