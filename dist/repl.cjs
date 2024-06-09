'use strict';

var repl = require('node:repl');
var _package = require('./package-DbB6qTh8.cjs');
var index = require('./index-Cw5WLTtf.cjs');
require('node:url');
require('esbuild');
require('node:crypto');
require('node:fs');
require('node:path');
require('node:os');
require('./temporary-directory-dlKDKQR6.cjs');

console.log(
  `Welcome to tsx v${_package.version} (Node.js ${process.version}).
Type ".help" for more information.`
);
const nodeRepl = repl.start();
const { eval: defaultEval } = nodeRepl;
const preEval = async function(code, context, filename, callback) {
  const transformed = await index.transform(
    code,
    filename,
    {
      loader: "ts",
      tsconfigRaw: {
        compilerOptions: {
          preserveValueImports: true
        }
      },
      define: {
        require: "global.require"
      }
    }
  ).catch(
    (error) => {
      console.log(error.message);
      return { code: "\n" };
    }
  );
  return defaultEval.call(this, transformed.code, context, filename, callback);
};
nodeRepl.eval = preEval;
