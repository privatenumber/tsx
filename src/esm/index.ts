import { isMainThread } from 'node:worker_threads';
import { isFeatureSupported, moduleRegister, moduleRegisterHooksCjsReload } from '../utils/node-features.js';
import { register } from './api/index.js';

// Loaded via --import flag
if (
	isFeatureSupported(moduleRegisterHooksCjsReload)
	|| (
		isFeatureSupported(moduleRegister)
		&& isMainThread
	)
) {
	register();
}

export * from './hook/index.js';
