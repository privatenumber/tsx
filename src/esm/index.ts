// Namespace import avoids a load-time SyntaxError on Node < 22.14, which
// doesn't export isInternalThread.
// https://github.com/nodejs/node/pull/56469
import * as workerThreads from 'node:worker_threads';
import { isFeatureSupported, moduleRegister, moduleRegisterHooksCjsReload } from '../utils/node-features.js';
import { register } from './api/index.js';
import { createDefaultData, createInitialize, createGlobalPreload } from './hook/initialize.js';
import { createLoad } from './hook/load.js';
import { createResolve } from './hook/resolve.js';

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

// The async module.register() path registers a cache-busted copy of this
// entry per registration (`./esm/index.mjs?<unique-id>`). Only this entry
// module is re-evaluated per copy — imported modules can be hoisted into
// bundler chunks that evaluate once per thread — so the per-registration
// hook state must be created here for each registration to get its own
// namespace and active flag (#806).
const data = createDefaultData();

export const initialize = createInitialize(data);
export const globalPreload = createGlobalPreload(data);
export const load = createLoad(data);
export const resolve = createResolve(data);
