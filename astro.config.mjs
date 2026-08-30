// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://zryna.com',
	integrations: [
		sitemap(),
		starlight({
			title: 'Zryna',
			description:
				'A strict, JavaScript-friendly language designed for JavaScript, WebAssembly, and native targets.',
			favicon: '/favicon.svg',
			customCss: ['./src/styles/custom.css'],
			head: [
				{
					tag: 'meta',
					attrs: {
						property: 'og:image',
						content: 'https://zryna.com/zryna-social-preview-v2.png',
					},
				},
				{
					tag: 'meta',
					attrs: { property: 'og:image:width', content: '1200' },
				},
				{
					tag: 'meta',
					attrs: { property: 'og:image:height', content: '630' },
				},
				{
					tag: 'meta',
					attrs: { property: 'og:image:alt', content: 'Zryna — one source, three targets' },
				},
				{
					tag: 'meta',
					attrs: { name: 'twitter:card', content: 'summary_large_image' },
				},
				{
					tag: 'meta',
					attrs: {
						name: 'twitter:image',
						content: 'https://zryna.com/zryna-social-preview-v2.png',
					},
				},
			],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/zryna/zryna' }],
			sidebar: [
				{
					label: 'Learn',
					items: [
						{ label: 'Getting started', slug: 'guides/getting-started' },
						{ label: 'Roadmap', slug: 'guides/roadmap' },
					],
				},
				{
					label: 'Reference',
					items: [{ autogenerate: { directory: 'reference' } }],
				},
			],
			lastUpdated: false,
			editLink: {
				baseUrl: 'https://github.com/zryna/website/edit/main/',
			},
		}),
	],
});
