import { isMainThread } from 'node:worker_threads';
import { supportsModuleRegister } from '../utils/node-features.js';
import { registerLoader } from './register.js';

// Loaded via --import flag
if (
	supportsModuleRegister
	&& isMainThread
) {
	registerLoader();
}

export * from './loaders.js';
