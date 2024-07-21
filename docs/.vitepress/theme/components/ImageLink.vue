<script setup lang="ts">
defineProps<{
	imgSrc: string;
	href: string;
	alt: string;
}>();
</script>

<template>
	<a
		class="link"
		:href="href"
		:title="alt"
	>
		<img
			:src="imgSrc"
			:alt="alt"
		>
	</a>
</template>

<style scoped>
.link {
	@apply
		p-2
		box-border;
}

img {
	@apply
		w-full
		h-full
		drop-shadow;
}
</style>
