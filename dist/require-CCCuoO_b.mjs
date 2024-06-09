import { r as require } from './get-pipe-path-D2pYDmQS.mjs';
import { r as register } from './register-BycOz8w6.mjs';

let api;
const tsxRequire = (id, fromFile) => {
  if (!api) {
    api = register({
      namespace: Date.now().toString()
    });
  }
  return api.require(id, fromFile);
};
const resolve = (id, fromFile, options) => {
  if (!api) {
    api = register({
      namespace: Date.now().toString()
    });
  }
  return api.resolve(id, fromFile, options);
};
resolve.paths = require.resolve.paths;
tsxRequire.resolve = resolve;
tsxRequire.main = require.main;
tsxRequire.extensions = require.extensions;
tsxRequire.cache = require.cache;

export { tsxRequire as t };
