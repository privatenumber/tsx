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

setTimeout(() => {}, 1e5);
console.log('READY');
