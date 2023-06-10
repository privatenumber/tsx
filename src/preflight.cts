import './suppress-warnings.cts';

/**
 * Hook require() to transform to CJS
 *
 * This needs to be loaded via --require flag so subsequent --require
 * flags can support TypeScript.
 *
 * This is also added in loader.ts for the loader API.
 * Although it is required twice, it's not executed twice because
 * it's cached.
 */
require('@esbuild-kit/cjs-loader');

// If a parent process is detected
if (process.send) {
	// Can happen if parent process is disconnected, but most likely
	// it was because parent process was killed via SIGQUIT
	const exitOnDisconnect = ()=> {
		// the exit code doesn't matter, as the parent's exit code is the 
		// one that is returned, and has already been returned by now. 
		// If this is not performed, the process will continue to run 
		// detached from the parent. 
		process.exit(1);
	};
	process.on('disconnect', exitOnDisconnect);
	// adding the disconnect listner on the process will cause this
	// child process to not exit. 
	(process as any).channel.unref();
}
