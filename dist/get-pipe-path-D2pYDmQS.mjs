import { createRequire } from 'module';
import path from 'node:path';
import { t as tmpdir } from './temporary-directory-CM_Hq0H1.mjs';

var require$1 = (
			true
				? /* @__PURE__ */ createRequire(import.meta.url)
				: require
		);

const isWindows = process.platform === "win32";

const getPipePath = (processId) => {
  const pipePath = path.join(tmpdir, `${processId}.pipe`);
  return isWindows ? `\\\\?\\pipe\\${pipePath}` : pipePath;
};

export { getPipePath as g, isWindows as i, require$1 as r };
