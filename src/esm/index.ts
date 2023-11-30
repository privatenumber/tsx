import { isMainThread } from 'node:worker_threads';
import { isFeatureSupported, moduleRegister } from '../utils/node-features.js';
import { registerLoader } from './register.js';

// Loaded via --import flag
if (
	isFeatureSupported(moduleRegister)
	&& isMainThread
) {
	registerLoader();
}

export * from './loaders.js';
