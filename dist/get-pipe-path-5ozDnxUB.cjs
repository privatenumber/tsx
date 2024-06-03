'use strict';

var path = require('node:path');
var temporaryDirectory = require('./temporary-directory-dlKDKQR6.cjs');

const isWindows = process.platform === "win32";

const getPipePath = (processId) => {
  const pipePath = path.join(temporaryDirectory.tmpdir, `${processId}.pipe`);
  return isWindows ? `\\\\?\\pipe\\${pipePath}` : pipePath;
};

exports.getPipePath = getPipePath;
exports.isWindows = isWindows;
