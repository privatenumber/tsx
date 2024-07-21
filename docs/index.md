---
outline: false
---

<div class="mb-10">
<img src="/logo-dark.svg" width="150" class="light:hidden" alt="tsx: TypeScript Execute">
<img src="/logo-light.svg" width="150" class="dark:hidden" alt="tsx: TypeScript Execute">
</div>

# TypeScript Execute <span class="font-normal">(_tsx_)</span>

_tsx_ stands for _TypeScript Execute_ and it's a Node.js enhancement to run [TypeScript](https://www.typescriptlang.org).

For starters, think of `tsx` as an alias to `node` and use it the same way:

<div class="tsx-before-after">

```sh
node file.js
```
<span class="hidden sm:block">→</span>
<span class="sm:hidden">↓</span>
```sh
tsx file.ts
```
</div>

You can pass in Node CLI flags and JS files too:
```sh
tsx --env-file=.env ./file.js
```

## Features

### Seamless TypeScript execution

Run TypeScript code without worrying about configuration!

_tsx_ runs your TypeScript code with modern and sensible defaults, making it user-friendly and especially great for beginners.

### Seamless CJS ↔ ESM imports

No need to wonder whether a package is CommonJS or ESM again.

If you've encountered the `ERR_REQUIRE_ESM` error in Node, you'll never see it again!

### Watch mode

As a DX bonus, _tsx_ comes with [Watch mode](/watch-mode.md) to re-run your files whenever you save them.

Iterate on your code faster and boost productivity!

---

<a href="/faq#who-uses-tsx" class="!no-underline">Who uses _tsx_?</a>

<Marquee class="mt-6 dark:bg-zinc-800 py-6" :velocity="20">
<div class="flex gap-6 items-center min-w-full">
<ImageLink
	class="h-12"
	alt="Vercel"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Avercel&type=code"
	img-src="/logos/vercel.svg"
/>
<ImageLink
	class="h-12"
	alt="Google"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Agoogle&type=code"
	img-src="/logos/google.svg"
/>
<ImageLink
	class="h-12"
	alt="GitHub"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Agithub&type=code"
	img-src="/logos/github.svg"
/>
<ImageLink
	class="h-12"
	alt="Figma"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Afigma&type=code"
	img-src="/logos/figma.svg"
/>
<ImageLink
	class="h-12"
	alt="Square"
	href="https://github.com/square"
	img-src="/logos/square.svg"
/>
<ImageLink
	class="h-12"
	alt="Microsoft"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Amicrosoft&type=code"
	img-src="/logos/microsoft.svg"
/>
<ImageLink
	class="h-12"
	alt="OpenAI"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Aopenai&type=code"
	img-src="/logos/openai.svg"
/>
<ImageLink
	class="h-12"
	alt="Amazon AWS"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Aaws+OR+org%3Aawslabs&type=code"
	img-src="/logos/aws.svg"
/>
<ImageLink
	class="h-12"
	alt="Meta"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Afacebook&type=code"
	img-src="/logos/meta.svg"
/>
<ImageLink
	class="h-12"
	alt="IBM"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Aibm&type=code"
	img-src="/logos/ibm.svg"
/>
<ImageLink
	class="h-12"
	alt="Alibaba"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Aalibaba&type=code"
	img-src="/logos/alibaba.svg"
/>
<ImageLink
	class="h-12"
	alt="Mozilla"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Amozilla&type=code"
	img-src="/logos/mozilla.svg"
/>
<ImageLink
	class="h-12"
	alt="Cloudflare"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Acloudflare&type=code"
	img-src="/logos/cloudflare.svg"
/>
<ImageLink
	class="h-12"
	alt="Salesforce"
	href="https://github.com/search?q=path%3Apackage.json+%22%5C%22tsx%5C%22%3A+%5C%22%22+org%3Asalesforce&type=code"
	img-src="/logos/salesforce.svg"
/>
</div>
</Marquee>

## About the project

The idea for _tsx_ came about during a time when the Node.js ecosystem was getting fragmented due to the release of [ES Modules (ESM)](https://nodejs.org/api/esm.html). As packages migrated to ESM, projects struggled to reconcile their CommonJS apps with ESM dependencies.

Back then, _ts-node_ was the go-to tool for running TypeScript in Node.js, but it lacked ESM support and was quite complicated to use. We noticed several open-source tools using esbuild to run TypeScript in Node.js and decided to bring these efforts together into one simple, cohesive project.

**_tsx_ is designed to simplify your TypeScript experience.** It enhances Node.js with TypeScript support in both CommonJS and ESM modes, allowing you to switch between them seamlessly. It also supports `tsconfig.json` paths and includes a Watch mode to make development even easier.

Right now, the _tsx_ project development relies on user donations, which isn't sustainable in the long run. To keep _tsx_ reliable and growing, we need funding to cover maintenance and development costs.

If your company uses _tsx_ and would like to sponsor the project, [we'd love to hear from you](/contact)!

## Sponsors

<p align="center">
	<a href="https://github.com/sponsors/privatenumber" target="_blank">
		<img src="https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg">
	</a>
	<a class="button sponsor-button mt-10 mx-auto" href="https://github.com/sponsors/privatenumber" target="_blank">
		Become a sponsor
	</a>
</p>

<script setup lang="ts">
import ImageLink from './.vitepress/theme/components/ImageLink.vue';
import Marquee from './.vitepress/theme/components/Marquee.vue';
</script>

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

.sponsor-button {
	@apply
		text-white
		hover:text-white
		bg-pink-500
		hover:bg-pink-600
		;
}
</style>
