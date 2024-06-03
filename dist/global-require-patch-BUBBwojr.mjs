import Module from 'node:module';
import fs from 'node:fs';
import { p as parseEsm, t as transformDynamicImport, a as transformSync } from './index-CJRyxW85.mjs';
import { s as shouldApplySourceMap, i as inlineSourceMap, f as fileMatcher, a as fileUrlPrefix, t as tsconfigPathsMatcher, b as isRelativePath, r as resolveTsPath, c as tsExtensionsPattern, d as allowJs } from './resolve-ts-path-Da1fgfxD.mjs';
import { p as parent } from './client-Dd29HuLQ.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isESM = (code) => {
  if (!code.includes("import") && !code.includes("export")) {
    return false;
  }
  try {
    const hasModuleSyntax = parseEsm(code)[3];
    return hasModuleSyntax;
  } catch {
    return true;
  }
};

const typescriptExtensions = [
  ".cts",
  ".mts",
  ".ts",
  ".tsx",
  ".jsx"
];
const transformExtensions = [
  ".js",
  ".cjs",
  ".mjs"
];
const extensions = Object.assign(/* @__PURE__ */ Object.create(null), Module._extensions);
const defaultLoader = extensions[".js"];
const transformer = (module, filePath) => {
  if (parent?.send) {
    parent.send({
      type: "dependency",
      path: filePath
    });
  }
  const transformTs = typescriptExtensions.some((extension) => filePath.endsWith(extension));
  const transformJs = transformExtensions.some((extension) => filePath.endsWith(extension));
  if (!transformTs && !transformJs) {
    return defaultLoader(module, filePath);
  }
  let code = fs.readFileSync(filePath, "utf8");
  if (filePath.endsWith(".cjs")) {
    const transformed = transformDynamicImport(filePath, code);
    if (transformed) {
      code = shouldApplySourceMap() ? inlineSourceMap(transformed) : transformed.code;
    }
  } else if (transformTs || isESM(code)) {
    const transformed = transformSync(
      code,
      filePath,
      {
        tsconfigRaw: fileMatcher?.(filePath)
      }
    );
    code = shouldApplySourceMap() ? inlineSourceMap(transformed) : transformed.code;
  }
  module._compile(code, filePath);
};
[
  /**
   * Handles .cjs, .cts, .mts & any explicitly specified extension that doesn't match any loaders
   *
   * Any file requested with an explicit extension will be loaded using the .js loader:
   * https://github.com/nodejs/node/blob/e339e9c5d71b72fd09e6abd38b10678e0c592ae7/lib/internal/modules/cjs/loader.js#L430
   */
  ".js",
  /**
   * Loaders for implicitly resolvable extensions
   * https://github.com/nodejs/node/blob/v12.16.0/lib/internal/modules/cjs/loader.js#L1166
   */
  ".ts",
  ".tsx",
  ".jsx"
].forEach((extension) => {
  extensions[extension] = transformer;
});
Object.defineProperty(extensions, ".mjs", {
  value: transformer,
  // Prevent Object.keys from detecting these extensions
  // when CJS loader iterates over the possible extensions
  enumerable: false
});

const nodeModulesPath = `${path.sep}node_modules${path.sep}`;
const defaultResolver = Module._resolveFilename.bind(Module);
const resolveTsFilename = (request, parent, isMain, options) => {
  const tsPath = resolveTsPath(request);
  if (parent?.filename && (tsExtensionsPattern.test(parent.filename) || allowJs) && tsPath) {
    for (const tryTsPath of tsPath) {
      try {
        return defaultResolver(
          tryTsPath,
          parent,
          isMain,
          options
        );
      } catch (error) {
        const { code } = error;
        if (code !== "MODULE_NOT_FOUND" && code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
          throw error;
        }
      }
    }
  }
};
const resolveFilename = (request, parent, isMain, options) => {
  const queryIndex = request.indexOf("?");
  if (queryIndex !== -1) {
    request = request.slice(0, queryIndex);
  }
  if (request.startsWith(fileUrlPrefix)) {
    request = fileURLToPath(request);
  }
  if (tsconfigPathsMatcher && !isRelativePath(request) && !parent?.filename?.includes(nodeModulesPath)) {
    const possiblePaths = tsconfigPathsMatcher(request);
    for (const possiblePath of possiblePaths) {
      const tsFilename2 = resolveTsFilename(possiblePath, parent, isMain, options);
      if (tsFilename2) {
        return tsFilename2;
      }
      try {
        return defaultResolver(
          possiblePath,
          parent,
          isMain,
          options
        );
      } catch {
      }
    }
  }
  const tsFilename = resolveTsFilename(request, parent, isMain, options);
  if (tsFilename) {
    return tsFilename;
  }
  return defaultResolver(request, parent, isMain, options);
};

const register = () => {
  const { sourceMapsEnabled } = process;
  const { _extensions, _resolveFilename } = Module;
  process.setSourceMapsEnabled(true);
  Module._extensions = extensions;
  Module._resolveFilename = resolveFilename;
  return () => {
    if (sourceMapsEnabled === false) {
      process.setSourceMapsEnabled(false);
    }
    Module._extensions = _extensions;
    Module._resolveFilename = _resolveFilename;
  };
};

export { resolveFilename as a, register as r };
