/**
 * This module wraps node-pty to isolate known Windows-specific issues:
 * https://github.com/microsoft/node-pty/issues/437
 *
 * On Windows, killing a pty process can leave lingering sockets or handles,
 * preventing Node.js from exiting cleanly. By running node-pty in a separate
 * process, we can force a clean exit without hanging the main program or test runner.
 */
import { spawn } from 'node-pty';

const [file, ...args] = process.argv.slice(2);

const ptyProcess = spawn(file, args, { cols: 1000 });

process.stdin.pipe(ptyProcess);

ptyProcess.onData(chunk => process.stdout.write(chunk));

ptyProcess.onExit(({ exitCode }) => {
	// eslint-disable-next-line n/no-process-exit
	process.exit(exitCode);
});
