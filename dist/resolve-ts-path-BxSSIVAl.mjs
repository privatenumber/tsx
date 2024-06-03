import path from 'node:path';
import { parseTsconfig, getTsconfig, createFilesMatcher, createPathsMatcher } from 'get-tsconfig';

let fileMatcher;
let tsconfigPathsMatcher;
let allowJs = false;
const loadTsconfig = (configPath) => {
  let tsconfig = null;
  if (configPath) {
    const resolvedConfigPath = path.resolve(configPath);
    tsconfig = {
      path: resolvedConfigPath,
      config: parseTsconfig(resolvedConfigPath)
    };
  } else {
    try {
      tsconfig = getTsconfig();
    } catch {
    }
    if (!tsconfig) {
      return;
    }
  }
  fileMatcher = createFilesMatcher(tsconfig);
  tsconfigPathsMatcher = createPathsMatcher(tsconfig);
  allowJs = tsconfig?.config.compilerOptions?.allowJs ?? false;
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

export { fileUrlPrefix as a, isRelativePath as b, tsExtensionsPattern as c, allowJs as d, isJsonPattern as e, fileMatcher as f, requestAcceptsQuery as g, isDirectoryPattern as h, inlineSourceMap as i, loadTsconfig as l, resolveTsPath as r, shouldApplySourceMap as s, tsconfigPathsMatcher as t };
