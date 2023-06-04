import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  // Use GitHub Pages /repo/ URL if available
  ...process.env.BASE_URL && { base: process.env.BASE_URL },

	title: "tsx",
	description: "Node.js enhanced with esbuild to run TypeScript & ESM files",
	themeConfig: {
		// https://vitepress.dev/reference/default-theme-config

    // esbuild-kit GitHub profile icon
		logo: "https://avatars.githubusercontent.com/u/98902370?s=200&v=4",

		nav: [
			{ text: "Home", link: "/" },
			{ text: "Install", link: "/install" },
			{ text: "Usage", link: "/usage" },
		],

		sidebar: [
			{ text: "Install", link: "/install" },
			{ text: "Usage", link: "/usage" },
			{ text: "FAQ", link: "/faq" },
		],

		socialLinks: [
			{ icon: "github", link: "https://github.com/esbuild-kit/tsx" },
		],
	},
});
