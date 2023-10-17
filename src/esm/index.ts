import { isMainThread } from 'node:worker_threads';
import { supportsModuleRegister } from '../utils/node-features';
import { registerLoader } from './register';

// Loaded via --import flag
if (
	supportsModuleRegister
	&& isMainThread
) {
	registerLoader();
}

export * from './loaders.js';
export * from './loaders-deprecated.js';
