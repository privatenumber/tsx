<script setup lang="ts">
import { onMounted, ref } from 'vue';

const svgUrl = 'https://cdn.jsdelivr.net/gh/privatenumber/sponsors/sponsorkit/sponsors.svg';
const svgContent = ref<string>('');

const fetchSvg = async () => {
    const response = await fetch(svgUrl);
    const svgText = await response.text();
    svgContent.value = svgText.replace('<svg ', '<svg style="width:100%;height:auto;" ');
};

onMounted(() => {
    fetchSvg();
});
</script>

<template>
    <div
        v-if="svgContent"
        v-html="svgContent"
    />
    <a
        v-else
        href="https://github.com/sponsors/privatenumber/sponsorships?tier_id=416984"
        target="_blank"
    >
		<img :src="svgUrl">
	</a>
</template>
