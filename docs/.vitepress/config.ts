import { defineConfig } from 'vitepress';

const title = 'tsx';
const description = 'tsx (TypeScript Execute) - The easiest way to run TypeScript in Node.js';
const siteUrl = 'https://tsx.hirok.io';

export default defineConfig({
	lang: 'en-US',

	title,

	description,

	sitemap: {
		hostname: siteUrl,
	},

	lastUpdated: true,

	cleanUrls: true,

	ignoreDeadLinks: true,

	metaChunk: true,

	transformPageData(pageData) {
		if (pageData.isNotFound) {
			return;
		}

		const pageUrl = new URL(
			pageData.relativePath
				.replace(/(^|\/)index\.md$/, '$1')
				.replace(/\.md$/, ''),
			`${siteUrl}/`,
		).href;

		pageData.frontmatter.head ??= [];
		pageData.frontmatter.head.push(
			['link', {
				rel: 'canonical',
				href: pageUrl,
			}],
			['meta', {
				property: 'og:title',
				content: pageData.title,
			}],
			['meta', {
				property: 'og:url',
				content: pageUrl,
			}],
			['meta', {
				property: 'og:description',
				content: pageData.description || description,
			}],
		);
	},

	head: [
		['link', {
			rel: 'icon',
			type: 'image/svg+xml',
			href: '/logo-mini.svg',
		}],
		['meta', {
			property: 'og:type',
			content: 'website',
		}],
		['meta', {
			property: 'og:image',
			content: `${siteUrl}/social.png`,
		}],
		['meta', {
			property: 'og:site_name',
			content: title,
		}],
		['meta', {
			name: 'twitter:card',
			content: 'summary_large_image',
		}],
		['meta', {
			name: 'twitter:site',
			content: '@tsx_is',
		}],
		['script', {
			src: 'https://beamanalytics.b-cdn.net/beam.min.js',
			'data-token': 'ee893e1d-7484-4fb3-85b7-78c58b3d9c9e',
			async: '',
		}],
	],

	themeConfig: {
		siteTitle: false,

		logo: {
			light: '/logo-light.svg',
			dark: '/logo-dark.svg',
			alt: 'tsx',
		},

		outline: 'deep',

		editLink: {
			pattern: 'https://github.com/privatenumber/tsx/edit/master/docs/:path',
			text: 'Propose changes to this page',
		},

		nav: [
			{
				text: 'User guide',
				link: '/',
				activeMatch: '^(?!\/dev-api\/).*',
			},
			{
				text: 'Developer API',
				link: '/dev-api/',
				activeMatch: '/dev-api/',
			},
		],

		sidebar: {
			'/': [
				{
					text: 'Introduction',
					items: [
						{
							text: 'About tsx',
							link: '/',
						},
						{
							text: 'Getting started',
							link: '/getting-started',
						},
					],
				},
				{
					text: 'Usage',
					items: [
						{
							text: 'Node.js enhancement',
							link: '/node-enhancement',
						},
						{
							text: 'Watch mode',
							link: '/watch-mode',
						},
					],
				},
				{
					text: 'Integration',
					items: [
						{
							text: 'TypeScript',
							link: '/typescript',
						},
						{
							text: 'Compilation',
							link: '/compilation',
						},
						{
							text: 'Shell scripts',
							link: '/shell-scripts',
						},
						{
							text: 'VSCode debugging',
							link: '/vscode',
						},
					]
				},
				{
					text: 'Support',
					items: [
						{
							text: 'FAQ',
							link: '/faq',
							docFooterText: 'Frequently Asked Questions',
						},
						{
							text: 'Learning resources',
							link: '/learn',
						},
						{
							text: 'Help center (Sponsors only)',
							link: 'https://github.com/pvtnbr/tsx/discussions',
						},
						{
							text: 'Become a Sponsor',
							link: 'https://github.com/sponsors/privatenumber/sponsorships?tier_id=416984',
						},
					],
				},
			],
			'/dev-api/': [
				{
					text: 'About the Developer API',
					link: '/dev-api/',
				},
				{
					text: 'Automatic registration',
					items: [
						{
							text: 'Node.js CLI',
							link: '/dev-api/node-cli'
						},
						{
							text: 'Entry-point',
							link: '/dev-api/entry-point'
						},
					],
				},
				{
					text: 'Scoped TS loading',
					items: [
						{
							text: 'tsImport()',
							link: '/dev-api/ts-import'
						},
						{
							text: 'tsx.require()',
							link: '/dev-api/tsx-require'
						},
					],
				},
				{
					text: 'Register API',
					items: [
						{
							text: 'CommonJS',
							link: '/dev-api/register-cjs'
						},
						{
							text: 'ESM',
							link: '/dev-api/register-esm'
						},
					],
				},
			],
		},

		socialLinks: [
			{
				icon: 'github',
				link: 'https://github.com/privatenumber/tsx',
			},
			{
				icon: 'x',
				link: 'https://x.com/tsx_is',
			},
			{
				icon: {
					svg: '<svg viewBox="0 0 24 24"><path d="M22 4H2v16h20zm-2 4l-8 5l-8-5V6l8 5l8-5z"/></svg>'
				},
				link: '/contact'
			}
		],

		search: {
			provider: 'local',
		},

		carbonAds: {
			code: 'CW7DEKJY',
			placement: 'tsxis',
		},
	},
});
