<template>
	<div>
		<h4 class="text-base font-semibold mb-2">Premium sponsors</h4>
	</div>
	<a
		href="https://github.com/sponsors/privatenumber/sponsorships?pay_prorated=false&tier_id=388346"
		target="_blank"
		class="sponsor-placeholder"
	>
		Your logo + link here

		<button type="button" class="sponsor-button mt-4">
			Become a sponsor
		</button>
	</a>
</template>

<style scoped>
.sponsor-placeholder {
	@apply
		block
		border-2
		border-dashed
		rounded
		py-6
		text-center
		text-sm
		transition-colors
		text-zinc-500
		border-zinc-400
		hover:text-zinc-800
		hover:border-zinc-700;
}

html.dark .sponsor-placeholder {
	@apply
		border-zinc-500
		text-zinc-500
		hover:border-zinc-200
		hover:text-zinc-200;
}

.sponsor-button {
	@apply
		text-xs
		rounded-full
		bg-pink-500
		text-white
		py-1
		px-4;
}
</style>
