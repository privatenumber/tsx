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
//
// Copies registered as chained async hooks (see register()) carry the
// `tsx-chained` query and must not auto-register: they only provide
// resolve/load for downstream nextResolve() chaining.
const isChainedAsyncHook = new URL(import.meta.url).searchParams.has('tsx-chained');
if (
	!isChainedAsyncHook
	&& (
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

// Chained async hook copies (see register()) only provide resolve for
// downstream nextResolve() chaining. They must not provide load: module
// loading stays on the sync hooks to avoid double-transformation and
// format-detection conflicts.
// https://github.com/privatenumber/tsx/issues/853
export const load = isChainedAsyncHook ? undefined : createLoad(data);

const baseResolve = createResolve(data);
export const resolve = (
	...args: Parameters<typeof baseResolve>
) => {
	// The tsx:// protocol (scoped tsImport() requests) is owned by the sync
	// hooks; passing it through here avoids double-processing the namespace
	// handshake.
	if (isChainedAsyncHook && args[0].startsWith('tsx://')) {
		const nextResolve = args[2];
		return nextResolve(args[0], args[1]);
	}
	return baseResolve(...args);
};
