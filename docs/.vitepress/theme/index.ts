import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';
import AsideSponsors from './components/AsideSponsors.vue';
import './styles.css';

export default {
	extends: DefaultTheme,
	Layout: () => h(
		DefaultTheme.Layout,
		null,
		{
			'aside-ads-before': () => h(AsideSponsors),
		},
	),
};
