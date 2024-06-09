'use strict';

var node_worker_threads = require('node:worker_threads');
var nodeFeatures = require('../node-features-B5a2EPMS.cjs');
var register$1 = require('../register-CvaYgxA5.cjs');
require('../get-pipe-path-BRzkrjmO.cjs');
require('node:module');
var path = require('node:path');
var node_url = require('node:url');
require('get-tsconfig');
var fs = require('node:fs');
require('esbuild');
require('node:crypto');
var index = require('../index-Cw5WLTtf.cjs');
var client = require('../client-D05RSYSD.cjs');
var register = require('../register-B6sXcRgr.cjs');
require('../require-_6g1l2k7.cjs');
var promises = require('node:fs/promises');
require('module');
require('../temporary-directory-dlKDKQR6.cjs');
require('node:os');
require('node:net');

const data = {
  active: true
};
const initialize = async (options) => {
  if (!options) {
    throw new Error("tsx must be loaded with --import instead of --loader\nThe --loader flag was deprecated in Node v20.6.0 and v18.19.0");
  }
  data.namespace = options.namespace;
  if (options.tsconfig !== false) {
    register.loadTsconfig(options.tsconfig ?? process.env.TSX_TSCONFIG_PATH);
  }
  if (options.port) {
    data.port = options.port;
    options.port.on("message", (message) => {
      if (message === "deactivate") {
        data.active = false;
        options.port.postMessage({ type: "deactivated" });
      }
    });
  }
};
const globalPreload = () => {
  register.loadTsconfig(process.env.TSX_TSCONFIG_PATH);
  return "process.setSourceMapsEnabled(true);";
};

const packageJsonCache = /* @__PURE__ */ new Map();
const readPackageJson = async (filePath) => {
  if (packageJsonCache.has(filePath)) {
    return packageJsonCache.get(filePath);
  }
  const exists = await fs.promises.access(filePath).then(
    () => true,
    () => false
  );
  if (!exists) {
    packageJsonCache.set(filePath, void 0);
    return;
  }
  const packageJsonString = await fs.promises.readFile(filePath, "utf8");
  try {
    const packageJson = JSON.parse(packageJsonString);
    packageJsonCache.set(filePath, packageJson);
    return packageJson;
  } catch {
    throw new Error(`Error parsing: ${filePath}`);
  }
};
const findPackageJson = async (filePath) => {
  let packageJsonUrl = new URL("package.json", filePath);
  while (true) {
    if (packageJsonUrl.pathname.endsWith("/node_modules/package.json")) {
      break;
    }
    const packageJsonPath = node_url.fileURLToPath(packageJsonUrl);
    const packageJson = await readPackageJson(packageJsonPath);
    if (packageJson) {
      return packageJson;
    }
    const lastPackageJSONUrl = packageJsonUrl;
    packageJsonUrl = new URL("../package.json", packageJsonUrl);
    if (packageJsonUrl.pathname === lastPackageJSONUrl.pathname) {
      break;
    }
  }
};
const getPackageType = async (filePath) => {
  const packageJson = await findPackageJson(filePath);
  return packageJson?.type ?? "commonjs";
};

const getFormatFromExtension = (fileUrl) => {
  [fileUrl] = fileUrl.split("?");
  const extension = path.extname(fileUrl);
  if (extension === ".json") {
    return "json";
  }
  if (extension === ".mjs" || extension === ".mts") {
    return "module";
  }
  if (extension === ".cjs" || extension === ".cts") {
    return "commonjs";
  }
};
const getFormatFromFileUrl = (fileUrl) => {
  const format = getFormatFromExtension(fileUrl);
  if (format) {
    return format;
  }
  if (register.tsExtensionsPattern.test(fileUrl)) {
    return getPackageType(fileUrl);
  }
};
const namespaceQuery = "tsx-namespace=";
const getNamespace = (url) => {
  const index = url.indexOf(namespaceQuery);
  if (index === -1) {
    return;
  }
  const charBefore = url[index - 1];
  if (charBefore !== "?" && charBefore !== "&") {
    return;
  }
  const startIndex = index + namespaceQuery.length;
  const endIndex = url.indexOf("&", startIndex);
  return endIndex === -1 ? url.slice(startIndex) : url.slice(startIndex, endIndex);
};

const contextAttributesProperty = nodeFeatures.isFeatureSupported(nodeFeatures.importAttributes) ? "importAttributes" : "importAssertions";
const load = async (url, context, nextLoad) => {
  if (!data.active) {
    return nextLoad(url, context);
  }
  const urlNamespace = getNamespace(url);
  if (data.namespace && data.namespace !== urlNamespace) {
    return nextLoad(url, context);
  }
  if (data.port) {
    const parsedUrl = new URL(url);
    parsedUrl.searchParams.delete("tsx-namespace");
    data.port.postMessage({
      type: "load",
      url: parsedUrl.toString()
    });
  }
  if (client.parent.send) {
    client.parent.send({
      type: "dependency",
      path: url
    });
  }
  if (register.isJsonPattern.test(url)) {
    if (!context[contextAttributesProperty]) {
      context[contextAttributesProperty] = {};
    }
    context[contextAttributesProperty].type = "json";
  }
  const loaded = await nextLoad(url, context);
  const filePath = url.startsWith("file://") ? node_url.fileURLToPath(url) : url;
  if (loaded.format === "commonjs" && nodeFeatures.isFeatureSupported(nodeFeatures.esmLoadReadFile) && loaded.responseURL?.startsWith("file:") && !filePath.endsWith(".cjs")) {
    const code2 = await promises.readFile(new URL(url), "utf8");
    if (!filePath.endsWith(".js") || index.isESM(code2)) {
      const transformed = index.transformSync(
        code2,
        filePath,
        {
          tsconfigRaw: register.fileMatcher?.(filePath)
        }
      );
      const filePathWithNamespace = urlNamespace ? `${filePath}?namespace=${encodeURIComponent(urlNamespace)}` : filePath;
      loaded.responseURL = `data:text/javascript,${encodeURIComponent(transformed.code)}?filePath=${encodeURIComponent(filePathWithNamespace)}`;
      return loaded;
    }
  }
  if (!loaded.source) {
    return loaded;
  }
  const code = loaded.source.toString();
  if (
    // Support named imports in JSON modules
    loaded.format === "json" || register.tsExtensionsPattern.test(url)
  ) {
    const transformed = await index.transform(
      code,
      filePath,
      {
        tsconfigRaw: register.fileMatcher?.(filePath)
      }
    );
    return {
      format: "module",
      source: register.inlineSourceMap(transformed)
    };
  }
  if (loaded.format === "module") {
    const dynamicImportTransformed = index.transformDynamicImport(filePath, code);
    if (dynamicImportTransformed) {
      loaded.source = register.inlineSourceMap(dynamicImportTransformed);
    }
  }
  return loaded;
};

const resolveMissingFormat = async (resolved) => {
  if (!resolved.format && resolved.url.startsWith(register.fileUrlPrefix)) {
    resolved.format = await getFormatFromFileUrl(resolved.url);
  }
  return resolved;
};
const extensions = [".js", ".json", ".ts", ".tsx", ".jsx"];
const tryExtensions = async (specifier, context, nextResolve) => {
  const [specifierWithoutQuery, query] = specifier.split("?");
  let throwError;
  for (const extension of extensions) {
    try {
      return await resolveMissingFormat(
        await nextResolve(
          specifierWithoutQuery + extension + (query ? `?${query}` : ""),
          context
        )
      );
    } catch (_error) {
      if (throwError === void 0 && _error instanceof Error) {
        const { message } = _error;
        _error.message = _error.message.replace(`${extension}'`, "'");
        _error.stack = _error.stack.replace(message, _error.message);
        throwError = _error;
      }
    }
  }
  throw throwError;
};
const tryDirectory = async (specifier, context, nextResolve) => {
  const isExplicitDirectory = register.isDirectoryPattern.test(specifier);
  const appendIndex = isExplicitDirectory ? "index" : "/index";
  const [specifierWithoutQuery, query] = specifier.split("?");
  try {
    return await tryExtensions(
      specifierWithoutQuery + appendIndex + (query ? `?${query}` : ""),
      context,
      nextResolve
    );
  } catch (_error) {
    if (!isExplicitDirectory) {
      try {
        return await tryExtensions(specifier, context, nextResolve);
      } catch {
      }
    }
    const error = _error;
    const { message } = error;
    error.message = error.message.replace(`${appendIndex.replace("/", path.sep)}'`, "'");
    error.stack = error.stack.replace(message, error.message);
    throw error;
  }
};
const tryTsPaths = async (url, context, nextResolve) => {
  const tsPaths = register.mapTsExtensions(url);
  if (!tsPaths) {
    return;
  }
  for (const tsPath of tsPaths) {
    try {
      return await resolveMissingFormat(
        await nextResolve(tsPath, context)
      );
    } catch (error) {
      const { code } = error;
      if (code !== "ERR_MODULE_NOT_FOUND" && code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        throw error;
      }
    }
  }
};
const resolve = async (specifier, context, nextResolve, recursiveCall) => {
  if (!data.active) {
    return nextResolve(specifier, context);
  }
  console.log("resolve", {
    specifier,
    context
  });
  const parentNamespace = context.parentURL && getNamespace(context.parentURL);
  const acceptsQuery = register.requestAcceptsQuery(specifier);
  if (acceptsQuery) {
    let requestNamespace = getNamespace(specifier);
    if (parentNamespace && !requestNamespace) {
      requestNamespace = parentNamespace;
      specifier += `${specifier.includes("?") ? "&" : "?"}${namespaceQuery}${parentNamespace}`;
    }
    if (data.namespace && data.namespace !== requestNamespace) {
      return nextResolve(specifier, context);
    }
    if (register.isDirectoryPattern.test(specifier)) {
      return await tryDirectory(specifier, context, nextResolve);
    }
  } else if (
    // Bare specifier
    // TS path alias
    register.tsconfigPathsMatcher && !context.parentURL?.includes("/node_modules/")
  ) {
    const possiblePaths = register.tsconfigPathsMatcher(specifier);
    for (const possiblePath of possiblePaths) {
      try {
        return await resolve(
          node_url.pathToFileURL(possiblePath).toString(),
          context,
          nextResolve
        );
      } catch {
      }
    }
  }
  if ((specifier.startsWith("#") || !register.isBarePackageName.test(specifier)) && (register.tsExtensionsPattern.test(context.parentURL) || register.allowJs)) {
    const resolved = await tryTsPaths(specifier, context, nextResolve);
    if (resolved) {
      return resolved;
    }
  }
  try {
    const resolved = await resolveMissingFormat(
      await nextResolve(specifier, context)
    );
    if (register.requestAcceptsQuery(resolved.url)) {
      const resolvedNamespace = getNamespace(resolved.url);
      if (parentNamespace && !resolvedNamespace) {
        resolved.url += `${resolved.url.includes("?") ? "&" : "?"}${namespaceQuery}${parentNamespace}`;
      }
    }
    return resolved;
  } catch (error) {
    if (error instanceof Error && !recursiveCall) {
      const nodeError = error;
      const { code } = nodeError;
      if (code === "ERR_UNSUPPORTED_DIR_IMPORT") {
        try {
          return await tryDirectory(specifier, context, nextResolve);
        } catch (error_) {
          if (error_.code !== "ERR_PACKAGE_IMPORT_NOT_DEFINED") {
            throw error_;
          }
        }
      }
      if (code === "ERR_MODULE_NOT_FOUND") {
        if (nodeError.url) {
          const resolved = await tryTsPaths(nodeError.url, context, nextResolve);
          if (resolved) {
            return resolved;
          }
        } else {
          const isExportPath = error.message.match(/^Cannot find module '([^']+)'/);
          if (isExportPath) {
            const [, exportPath] = isExportPath;
            const resolved = await tryTsPaths(exportPath, context, nextResolve);
            if (resolved) {
              return resolved;
            }
          }
          const isPackagePath = error.message.match(/^Cannot find package '([^']+)'/);
          if (isPackagePath) {
            const [, packageJsonPath] = isPackagePath;
            const packageJsonUrl = node_url.pathToFileURL(packageJsonPath);
            if (!packageJsonUrl.pathname.endsWith("/package.json")) {
              packageJsonUrl.pathname += "/package.json";
            }
            const packageJson = await index.readJsonFile(packageJsonUrl);
            if (packageJson?.main) {
              const resolvedMain = new URL(packageJson.main, packageJsonUrl);
              const resolved = await tryTsPaths(resolvedMain.toString(), context, nextResolve);
              if (resolved) {
                return resolved;
              }
            }
          }
        }
        if (acceptsQuery) {
          try {
            return await tryExtensions(specifier, context, nextResolve);
          } catch {
          }
        }
      }
    }
    throw error;
  }
};

if (nodeFeatures.isFeatureSupported(nodeFeatures.moduleRegister) && node_worker_threads.isMainThread) {
  register$1.register();
}

exports.globalPreload = globalPreload;
exports.initialize = initialize;
exports.load = load;
exports.resolve = resolve;
