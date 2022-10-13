console.log('READY');

const signals = [
	'SIGINT',
	'SIGTERM',
];

let counter = 0;
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

// For TypeScript to consider this file a module
export {};
