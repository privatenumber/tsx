'use strict';

var register = require('../../register-BOVurJAs.cjs');
require('../../get-pipe-path-BRzkrjmO.cjs');
var register$1 = require('../../register-BYY4Zm0k.cjs');
require('../../require-BQHfyftI.cjs');
require('node:module');
require('node:worker_threads');
require('node:url');
require('module');
require('node:path');
require('../../temporary-directory-dlKDKQR6.cjs');
require('node:os');
require('get-tsconfig');
require('node:fs');
require('../../index-Cw5WLTtf.cjs');
require('esbuild');
require('node:crypto');
require('../../client-D05RSYSD.cjs');
require('node:net');

const tsImport = (specifier, options) => {
  if (!options || typeof options === "object" && !options.parentURL) {
    throw new Error("The current file path (import.meta.url) must be provided in the second argument of tsImport()");
  }
  const isOptionsString = typeof options === "string";
  const parentURL = isOptionsString ? options : options.parentURL;
  const namespace = Date.now().toString();
  register$1.register({
    namespace
  });
  const api = register.register({
    namespace,
    ...isOptionsString ? {} : options
  });
  return api.import(specifier, parentURL);
};

exports.register = register.register;
exports.tsImport = tsImport;
