import repl from 'node:repl';
import { v as version } from './package-CG_q1brP.mjs';
import { t as transform } from './index-CU-y6T80.mjs';
import 'node:url';
import 'esbuild';
import 'node:crypto';
import 'node:fs';
import 'node:path';
import 'node:os';
import './temporary-directory-CM_Hq0H1.mjs';

console.log(
  `Welcome to tsx v${version} (Node.js ${process.version}).
Type ".help" for more information.`
);
const nodeRepl = repl.start();
const { eval: defaultEval } = nodeRepl;
const preEval = async function(code, context, filename, callback) {
  const transformed = await transform(
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
