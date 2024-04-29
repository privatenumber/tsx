import Module from 'module';
import { parent } from '../utils/ipc/client.js';
import { patchExtensions } from './patch-extensions.js';
import { patchResolve } from './patch-resolve.js';

process.setSourceMapsEnabled(true);

patchExtensions(Module._extensions, parent);

Module._resolveFilename = patchResolve(Module._resolveFilename.bind(Module));
