'use strict';

var repl = require('node:repl');
var esbuild = require('esbuild');

const patchEval = (nodeRepl) => {
  const { eval: defaultEval } = nodeRepl;
  const preEval = async function(code, context, filename, callback) {
    try {
      const transformed = await esbuild.transform(
        code,
        {
          sourcefile: filename,
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
      );
      code = transformed.code;
    } catch {
    }
    return defaultEval.call(this, code, context, filename, callback);
  };
  nodeRepl.eval = preEval;
};
const { start } = repl;
repl.start = function() {
  const nodeRepl = Reflect.apply(start, this, arguments);
  patchEval(nodeRepl);
  return nodeRepl;
};
