import { defineConfig } from 'vitepress';

export default defineConfig({
	lang: 'en-US',

	title: 'tsx',

	description: 'tsx (TypeScript Execute) - The easiest way to run TypeScript in Node.js',

	lastUpdated: true,

	cleanUrls: true,

	ignoreDeadLinks: true,

	metaChunk: true,

	head: [
		[
			'script',
			{
				src: 'https://beamanalytics.b-cdn.net/beam.min.js',
				'data-token': 'ee893e1d-7484-4fb3-85b7-78c58b3d9c9e',
				async: '',
			},
		],
	],

	themeConfig: {
		siteTitle: 'tsx',

		editLink: {
			pattern: 'https://github.com/privatenumber/tsx/edit/develop/docs/:path',
			text: 'Edit this page on GitHub',
		},

		nav: [
			{ text: 'Discussions', link: 'https://github.com/privatenumber/tsx/discussions' },
		],

		sidebar: [
			{
				text: 'Introduction',
				items: [
					{ text: 'What is tsx?', link: '/' },
					{ text: 'Getting Started', link: '/getting-started' },
				],
			},
			{
				text: 'Usage',
				items: [
					{ text: 'Basic usage', link: '/usage' },
					{ text: 'Watch mode', link: '/watch-mode' },
					{ text: 'Scripts', link: '/scripts' },
				]
			},
			{
				text: 'Integration',
				items: [
					{ text: 'VSCode', link: '/vscode' },
					{ text: 'Node.js', link: '/node' },
				]
			},
			{
				text: 'FAQ',
				link: '/faq',
			},
		],

		socialLinks: [
			{
				icon: 'github',
				link: 'https://github.com/privatenumber/tsx',
			},
		],

		search: {
			provider: 'local',
		},
	},
});
