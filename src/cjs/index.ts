import Module from 'module';
import { parent } from '../utils/ipc/client.js';
import { patchExtensions } from './patch-extensions.js';
import { resolveFilename } from './resolve-filename.js';

process.setSourceMapsEnabled(true);

patchExtensions(Module._extensions, parent);

Module._resolveFilename = resolveFilename;
