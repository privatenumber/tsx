// Namespace import avoids a load-time SyntaxError on Node < 22.14, which
// doesn't export isInternalThread.
// https://github.com/nodejs/node/pull/56469
import * as workerThreads from 'node:worker_threads';
import { isFeatureSupported, moduleRegister, moduleRegisterHooksCjsReload } from '../utils/node-features.js';
import { register } from './api/index.js';
import { createHooks } from './hook/index.js';

// Loaded via --import flag
if (
	(
		isFeatureSupported(moduleRegisterHooksCjsReload)
		// Keep user Worker preloads active; only skip Node's internal loader
		// thread, where async module.register() preloads can evaluate tsx itself.
		// https://github.com/nodejs/node/blob/v26.0.0/doc/api/worker_threads.md#worker_threadsisinternalthread
		&& !workerThreads.isInternalThread
	)
	|| (
		isFeatureSupported(moduleRegister)
		&& workerThreads.isMainThread
	)
) {
	register();
}

// Hook state must live in this entry's module scope: module.register() loads
// a new cache-busted copy of this entry per registration, but bundled chunks
// it imports are shared and only evaluate once. State in a shared chunk would
// be overwritten by every registration (namespaces clobbering each other).
export const {
	initialize,
	globalPreload,
	load,
	resolve,
} = createHooks();
