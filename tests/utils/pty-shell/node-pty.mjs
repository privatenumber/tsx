/**
 * node-pty is wrapped in an individual module instead of
 * being called directly because it doesn't exist on Windows
 *
 * https://github.com/microsoft/node-pty/issues/437
 */
import { spawn } from 'node-pty';

const [file, ...args] = process.argv.slice(2);

const spawned = spawn(file, args, {
	cols: 1000,
});

process.on('message', (command) => {
	spawned.write(command);
});

spawned.onData((data) => {
	process.stdout.write(data);
});

spawned.onExit(({ exitCode }) => {
	process.exit(exitCode);
});
