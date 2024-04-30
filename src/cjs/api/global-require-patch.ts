import Module from 'module';
import { extensions } from './module-extensions.js';
import { resolveFilename } from './module-resolve-filename.js';

const { _extensions, _resolveFilename } = Module;
const sourceMapsEnabled = process.sourceMapsEnabled;

export const register = () => {
	process.setSourceMapsEnabled(true);

	// @ts-expect-error
	Module._extensions = extensions;
	Module._resolveFilename = resolveFilename;	
};

export const unregister = () => {
	if (sourceMapsEnabled === false) {
		process.setSourceMapsEnabled(false);
	}

	// @ts-expect-error
	Module._extensions = _extensions;
	Module._resolveFilename = _resolveFilename;
};
