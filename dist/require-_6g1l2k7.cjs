'use strict';

var getPipePath = require('./get-pipe-path-BRzkrjmO.cjs');
var register = require('./register-B6sXcRgr.cjs');

let api;
const tsxRequire = (id, fromFile) => {
  if (!api) {
    api = register.register({
      namespace: Date.now().toString()
    });
  }
  return api.require(id, fromFile);
};
const resolve = (id, fromFile, options) => {
  if (!api) {
    api = register.register({
      namespace: Date.now().toString()
    });
  }
  return api.resolve(id, fromFile, options);
};
resolve.paths = getPipePath.require.resolve.paths;
tsxRequire.resolve = resolve;
tsxRequire.main = getPipePath.require.main;
tsxRequire.extensions = getPipePath.require.extensions;
tsxRequire.cache = getPipePath.require.cache;

exports.tsxRequire = tsxRequire;
