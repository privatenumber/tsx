/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'**/*.md',
		'.vitepress/**/*.vue',
	],
	darkMode: 'selector',
	plugins: [
		({ addVariant }) => addVariant('light', 'html:not(.dark) &'),
	],
};
