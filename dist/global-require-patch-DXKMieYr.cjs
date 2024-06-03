'use strict';

var Module = require('node:module');
var resolveTsPath = require('./resolve-ts-path-BAcDpsFy.cjs');
var fs = require('node:fs');
var index = require('./index-CrNLWFic.cjs');
var client = require('./client-Biz7qEMc.cjs');
var path = require('node:path');
var node_url = require('node:url');

const isESM = (code) => {
  if (!code.includes("import") && !code.includes("export")) {
    return false;
  }
  try {
    const hasModuleSyntax = index.parseEsm(code)[3];
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
  if (client.parent?.send) {
    client.parent.send({
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
    const transformed = index.transformDynamicImport(filePath, code);
    if (transformed) {
      code = resolveTsPath.shouldApplySourceMap() ? resolveTsPath.inlineSourceMap(transformed) : transformed.code;
    }
  } else if (transformTs || isESM(code)) {
    const transformed = index.transformSync(
      code,
      filePath,
      {
        tsconfigRaw: resolveTsPath.fileMatcher?.(filePath)
      }
    );
    code = resolveTsPath.shouldApplySourceMap() ? resolveTsPath.inlineSourceMap(transformed) : transformed.code;
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
  const tsPath = resolveTsPath.resolveTsPath(request);
  if (parent?.filename && (resolveTsPath.tsExtensionsPattern.test(parent.filename) || resolveTsPath.allowJs) && tsPath) {
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
  console.log("resolveFilename", {
    request
  });
  const queryIndex = request.indexOf("?");
  if (queryIndex !== -1) {
    request = request.slice(0, queryIndex);
  }
  if (request.startsWith(resolveTsPath.fileUrlPrefix)) {
    request = node_url.fileURLToPath(request);
  }
  if (resolveTsPath.tsconfigPathsMatcher && !resolveTsPath.isRelativePath(request) && !parent?.filename?.includes(nodeModulesPath)) {
    const possiblePaths = resolveTsPath.tsconfigPathsMatcher(request);
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
  resolveTsPath.loadTsconfig(process.env.TSX_TSCONFIG_PATH);
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

exports.register = register;
exports.resolveFilename = resolveFilename;
