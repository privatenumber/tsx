const signals = [
	'SIGINT',
	'SIGTERM',
];

for (const name of signals) {
	process.on(name, () => {
		console.log(name);

		setTimeout(() => {
			console.log(name, 'HANDLER COMPLETED');
			process.exit(200);
		}, 100);
	});
}

setInterval(() => {}, 1e5);

console.log('READY');

// For TypeScript to consider this file a module
export {};
