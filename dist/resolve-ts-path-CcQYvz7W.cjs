'use strict';

var path = require('node:path');
var getTsconfig = require('get-tsconfig');

const inlineSourceMapPrefix = "\n//# sourceMappingURL=data:application/json;base64,";
const shouldApplySourceMap = () => process.sourceMapsEnabled ?? true;
const inlineSourceMap = ({ code, map }) => code + inlineSourceMapPrefix + Buffer.from(JSON.stringify(map), "utf8").toString("base64");

const tsconfig = process.env.TSX_TSCONFIG_PATH ? {
  path: path.resolve(process.env.TSX_TSCONFIG_PATH),
  config: getTsconfig.parseTsconfig(process.env.TSX_TSCONFIG_PATH)
} : getTsconfig.getTsconfig();
const fileMatcher = tsconfig && getTsconfig.createFilesMatcher(tsconfig);
const tsconfigPathsMatcher = tsconfig && getTsconfig.createPathsMatcher(tsconfig);
const allowJs = tsconfig?.config.compilerOptions?.allowJs ?? false;

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

exports.allowJs = allowJs;
exports.fileMatcher = fileMatcher;
exports.fileUrlPrefix = fileUrlPrefix;
exports.inlineSourceMap = inlineSourceMap;
exports.isDirectoryPattern = isDirectoryPattern;
exports.isJsonPattern = isJsonPattern;
exports.isRelativePath = isRelativePath;
exports.requestAcceptsQuery = requestAcceptsQuery;
exports.resolveTsPath = resolveTsPath;
exports.shouldApplySourceMap = shouldApplySourceMap;
exports.tsExtensionsPattern = tsExtensionsPattern;
exports.tsconfigPathsMatcher = tsconfigPathsMatcher;
