'use strict';

var module$1 = require('module');
var path = require('node:path');
var temporaryDirectory = require('./temporary-directory-dlKDKQR6.cjs');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
var require$1 = (
			false
				? /* @__PURE__ */ module$1.createRequire((typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.src || new URL('get-pipe-path-BRzkrjmO.cjs', document.baseURI).href)))
				: require
		);

const isWindows = process.platform === "win32";

const getPipePath = (processId) => {
  const pipePath = path.join(temporaryDirectory.tmpdir, `${processId}.pipe`);
  return isWindows ? `\\\\?\\pipe\\${pipePath}` : pipePath;
};

exports.getPipePath = getPipePath;
exports.isWindows = isWindows;
exports.require = require$1;
