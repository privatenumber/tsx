<script setup lang="ts">
import { ref } from 'vue';

const isSending = ref(false);
const name = ref('');
const email = ref('');
const subject = ref('');
const message = ref('');

const sendMessage = async () => {
	isSending.value = true;

	const body = new FormData();
	body.append('name', name.value);
	body.append('email', email.value);
	body.append('subject', subject.value);
	body.append('message', message.value);
	body.append('access_key', '122038f1-9646-4bb3-89de-55ab3e1bed50');

	const fetching = await fetch(
		'https://api.web3forms.com/submit',
		{
			method: 'POST',
			body,
		},
	);

	const response = await fetching.json();

	if (response.success) {
		// show popup
	}

	name.value = '';
	email.value = '';
	subject.value = '';
	message.value = '';
	isSending.value = false;
};
</script>

<template>
	<div class="mx-auto">
		<form @submit.prevent="sendMessage">
			<div
				class="
				flex
				flex-wrap
				md:flex-nowrap
				gap-4
				my-4
			"
			>
				<label class="w-full">
					<div class="label">Name</div>
					<input
						v-model="name"
						class="w-full"
						type="text"
						name="name"
						required
						:disabled="isSending"
						placeholder="Your name"
					>
				</label>

				<label class="w-full">
					<div class="label">Email</div>
					<input
						v-model="email"
						class="w-full"
						type="email"
						name="email"
						required
						:disabled="isSending"
						placeholder="your@email.com"
					>
				</label>
			</div>
			<div
				class="
				flex
				flex-wrap
				md:flex-nowrap
				gap-4
				my-4
			"
			>
				<label class="w-full">
					<div class="label">Subject</div>
					<input
						v-model="subject"
						class="w-full"
						type="text"
						name="subject"
						required
						:disabled="isSending"
						placeholder="Sponsorship, consultation, etc."
					>
				</label>
			</div>

			<label class="block my-5">
				<div class="label">Message</div>
				<textarea
					v-model="message"
					class="w-full h-40"
					placeholder="Hey there, can I ask you a question?"
					:disabled="isSending"
					required
				/>
			</label>

			<div class="flex flex-row-reverse">
				<button
					title="Send email"
					type="submit"
					class="send-email button"
					:disabled="isSending"
				>
					<template v-if="isSending">
						Sending...
					</template>
					<template v-else>
						Send
					</template>
				</button>
			</div>
		</form>
	</div>
</template>

<style scoped>
input, textarea, select {
	@apply
		rounded
		bg-zinc-100
		dark:bg-zinc-950
		py-2
		px-4;
}

label {
	@apply
		flex
		flex-col
		gap-2;
}

.send-email {
	@apply
		bg-blue-500
		text-white;
}
</style>
