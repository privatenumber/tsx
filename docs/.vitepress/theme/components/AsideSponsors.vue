<template>
	<div class="mb-8">
		<div>
			<h4 class="text-base font-semibold">Premium sponsors</h4>
		</div>
		<a
			href="https://www.prisma.io"
			target="_blank"
			rel="noopener"
		>
			<div class="my-4 py-6 px-6 bg-white/5">
				<img
					src="/logos/prisma-full.svg"
					alt="Prisma"
					class="object-cover"
				>
			</div>
		</a>
		<a
			href="https://github.com/sponsors/privatenumber/sponsorships?pay_prorated=false&tier_id=388346"
			target="_blank"
			rel="noopener"
			class="sponsor-button"
		>
			Become a premium sponsor
		</a>
	</div>
</template>

<style scoped>
.sponsor-button {
	@apply
		block
		w-fit
		mx-auto
		text-xs
		rounded-full
		transition-colors
		bg-pink-500
		hover:bg-pink-600
		text-white
		mt-5
		py-1.5
		px-4;
}
</style>
