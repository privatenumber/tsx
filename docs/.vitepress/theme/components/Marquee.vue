<script setup lang="ts">
import { ref, onMounted } from 'vue';

const waitImages = (
	element: HTMLElement,
) => {
	const images = element.querySelectorAll('img');
	return Promise.all(
		Array.from(images).map((image) => (
			new Promise<void>((resolve) => {
				if (image.complete) {
					resolve();
					return;
				}

				image.addEventListener('load', () => resolve());
				image.addEventListener('error', () => resolve());
			})
		))
	);
};

const props = defineProps<{
	velocity: number;
}>();

const $content = ref(null);

/**
 * Animation shouldn't start until the content is loaded and the width is
 * determined. Otherwise it will move at the rate of the initial width
 */
const animationDuration = ref({
	animationDuration: '',
});
const computeAnimationDuration = () => {
	animationDuration.value.animationDuration = `${$content.value.offsetWidth / props.velocity}s`;
};

const isPageVisible = ref<boolean>();
const checkIsPageVisible = () => {
	isPageVisible.value = document.visibilityState === 'visible';
};

onMounted(() => {
	document.addEventListener('visibilitychange', checkIsPageVisible);
	checkIsPageVisible();

	if ($content.value) {
		waitImages($content.value).then(computeAnimationDuration);
	}
});
</script>

<template>
	<div
		:class="[
			'marquee',
			{ moving: isPageVisible },
		]"
	>
		<div
			class="content"
			ref="$content"
			:style="animationDuration"
		>
			<slot />
		</div>
		<div
			class="content"
			:style="animationDuration"
		>
			<slot />
		</div>
	</div>
</template>

<style scoped>
.marquee {
	display: flex;
	white-space: nowrap;
	overflow: hidden;
}

.content {
	min-width: max-content;
}

.moving .content {
	animation: move-left linear infinite;
}


@keyframes move-left {
	0% {
		transform: translateX(0%);
	}
	100% {
		transform: translateX(-100%);
	}
}
</style>
