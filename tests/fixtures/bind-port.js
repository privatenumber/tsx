process.on('SIGTERM', () => {
	const waitTo = new Date() + 200;
	// Long sync exit simulate
	while (new Date() < waitTo) {}
});
import('net').then((net) => {
	const server = net.createServer();
	server.on('listening', () => {
		console.log('READY');
	});
	server.listen(1024);
});

setTimeout(() => {
	console.error('Forgotten process');
	process.exit(1);
}, 3000);
