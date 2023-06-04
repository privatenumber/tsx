---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: tsx
  text: TypeScript Execute
  tagline: ⚡ Node.js enhanced with esbuild to run TypeScript & ESM
  actions:
    - theme: brand
      text: Show me! 👇
      link: "#example"
    - theme: alt
      text: Install it
      link: /install

features:
  - title: ⚡ Blazingly fast execution
    details: It's powered by esbuild so it's insanely fast.
  - title: 📦 Works with CommonJS and ESM
    details: Supports next-gen TypeScript extensions (.cts & .mts)
  - title: 📘 Full TypeScript support
    details: It even resolves tsconfig.json paths!
---

<div id="example" align="center" style="margin-top: 4rem;">
  <iframe
    src="https://stackblitz.com/github/esbuild-kit/tsx/tree/master/docs/stackblitz?embed=1&file=index.ts&hideExplorer=1&hideNavigation=1&view=editor"
    style="max-width: 1000px; width: 100%; height: 600px; border: 0; border-radius: 4px; overflow: hidden;"
    frameborder="0"
  ></iframe>
</div>
