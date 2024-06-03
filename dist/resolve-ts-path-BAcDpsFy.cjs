'use strict';

var path = require('node:path');
var getTsconfig = require('get-tsconfig');

exports.fileMatcher = void 0;
exports.tsconfigPathsMatcher = void 0;
exports.allowJs = false;
const loadTsconfig = (configPath) => {
  let tsconfig = null;
  if (configPath) {
    const resolvedConfigPath = path.resolve(configPath);
    tsconfig = {
      path: resolvedConfigPath,
      config: getTsconfig.parseTsconfig(resolvedConfigPath)
    };
  } else {
    try {
      tsconfig = getTsconfig.getTsconfig();
    } catch {
    }
    if (!tsconfig) {
      return;
    }
  }
  exports.fileMatcher = getTsconfig.createFilesMatcher(tsconfig);
  exports.tsconfigPathsMatcher = getTsconfig.createPathsMatcher(tsconfig);
  exports.allowJs = tsconfig?.config.compilerOptions?.allowJs ?? false;
};

const inlineSourceMapPrefix = "\n//# sourceMappingURL=data:application/json;base64,";
const shouldApplySourceMap = () => process.sourceMapsEnabled ?? true;
const inlineSourceMap = ({ code, map }) => code + inlineSourceMapPrefix + Buffer.from(JSON.stringify(map), "utf8").toString("base64");

const getScheme = (url) => {
  const schemeIndex = url.indexOf(":");
  if (schemeIndex === -1) {
    return;
  }
  return url.slice(0, schemeIndex);
};
const isRelativePath = (request) => request[0] === "." && (request[1] === "/" || (request[1] === "." || request[2] === "/"));
const isUnixPath = (request) => isRelativePath(request) || path.isAbsolute(request);
const requestAcceptsQuery = (request) => {
  if (isUnixPath(request)) {
    return true;
  }
  const scheme = getScheme(request);
  return (
    // Expected to be file, https, etc...
    scheme && scheme !== "node"
  );
};
const fileUrlPrefix = "file://";
const tsExtensionsPattern = /\.([cm]?ts|[tj]sx)($|\?)/;
const isJsonPattern = /\.json($|\?)/;
const isDirectoryPattern = /\/(?:$|\?)/;

const tsExtensions = /* @__PURE__ */ Object.create(null);
tsExtensions[".js"] = [".ts", ".tsx", ".js", ".jsx"];
tsExtensions[".jsx"] = [".tsx", ".ts", ".jsx", ".js"];
tsExtensions[".cjs"] = [".cts"];
tsExtensions[".mjs"] = [".mts"];
const resolveTsPath = (filePath) => {
  const [pathname, search] = filePath.split("?");
  const extension = path.extname(pathname);
  const possibleExtensions = tsExtensions[extension];
  if (possibleExtensions) {
    const extensionlessPath = pathname.slice(0, -extension.length);
    return possibleExtensions.map(
      (tsExtension) => extensionlessPath + tsExtension + (search ? `?${search}` : "")
    );
  }
};

exports.fileUrlPrefix = fileUrlPrefix;
exports.inlineSourceMap = inlineSourceMap;
exports.isDirectoryPattern = isDirectoryPattern;
exports.isJsonPattern = isJsonPattern;
exports.isRelativePath = isRelativePath;
exports.loadTsconfig = loadTsconfig;
exports.requestAcceptsQuery = requestAcceptsQuery;
exports.resolveTsPath = resolveTsPath;
exports.shouldApplySourceMap = shouldApplySourceMap;
exports.tsExtensionsPattern = tsExtensionsPattern;
