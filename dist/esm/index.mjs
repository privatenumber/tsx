import { isMainThread } from 'node:worker_threads';
import { i as isFeatureSupported, a as importAttributes, e as esmLoadReadFile, m as moduleRegister } from '../node-features-Bye2pwSD.mjs';
import { r as register } from '../register-DSBdIh5P.mjs';
import '../get-pipe-path-D2pYDmQS.mjs';
import 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import 'get-tsconfig';
import fs from 'node:fs';
import 'esbuild';
import 'node:crypto';
import { i as isESM, a as transformSync, t as transform, b as transformDynamicImport, r as readJsonFile } from '../index-CU-y6T80.mjs';
import { p as parent } from '../client-Cg5Bp24g.mjs';
import { l as loadTsconfig, t as tsExtensionsPattern, a as isJsonPattern, b as inlineSourceMap, f as fileMatcher, c as requestAcceptsQuery, d as isDirectoryPattern, e as isBarePackageName, g as allowJs, h as fileUrlPrefix, m as mapTsExtensions, j as tsconfigPathsMatcher } from '../register-DVeEFLZ1.mjs';
import '../require-YyybwuSX.mjs';
import { readFile } from 'node:fs/promises';
import 'module';
import '../temporary-directory-CM_Hq0H1.mjs';
import 'node:os';
import 'node:net';

const data = {
  active: true
};
const initialize = async (options) => {
  if (!options) {
    throw new Error("tsx must be loaded with --import instead of --loader\nThe --loader flag was deprecated in Node v20.6.0 and v18.19.0");
  }
  data.namespace = options.namespace;
  if (options.tsconfig !== false) {
    loadTsconfig(options.tsconfig ?? process.env.TSX_TSCONFIG_PATH);
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
  loadTsconfig(process.env.TSX_TSCONFIG_PATH);
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
    const packageJsonPath = fileURLToPath(packageJsonUrl);
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
  if (tsExtensionsPattern.test(fileUrl)) {
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

const contextAttributesProperty = isFeatureSupported(importAttributes) ? "importAttributes" : "importAssertions";
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
  if (parent.send) {
    parent.send({
      type: "dependency",
      path: url
    });
  }
  if (isJsonPattern.test(url)) {
    if (!context[contextAttributesProperty]) {
      context[contextAttributesProperty] = {};
    }
    context[contextAttributesProperty].type = "json";
  }
  const loaded = await nextLoad(url, context);
  const filePath = url.startsWith("file://") ? fileURLToPath(url) : url;
  if (loaded.format === "commonjs" && isFeatureSupported(esmLoadReadFile) && loaded.responseURL?.startsWith("file:") && !filePath.endsWith(".cjs")) {
    const code2 = await readFile(new URL(url), "utf8");
    if (!filePath.endsWith(".js") || isESM(code2)) {
      const transformed = transformSync(
        code2,
        filePath,
        {
          tsconfigRaw: fileMatcher?.(filePath)
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
    loaded.format === "json" || tsExtensionsPattern.test(url)
  ) {
    const transformed = await transform(
      code,
      filePath,
      {
        tsconfigRaw: fileMatcher?.(filePath)
      }
    );
    return {
      format: "module",
      source: inlineSourceMap(transformed)
    };
  }
  if (loaded.format === "module") {
    const dynamicImportTransformed = transformDynamicImport(filePath, code);
    if (dynamicImportTransformed) {
      loaded.source = inlineSourceMap(dynamicImportTransformed);
    }
  }
  return loaded;
};

const resolveMissingFormat = async (resolved) => {
  if (!resolved.format && resolved.url.startsWith(fileUrlPrefix)) {
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
  const isExplicitDirectory = isDirectoryPattern.test(specifier);
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
  const tsPaths = mapTsExtensions(url);
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
  const acceptsQuery = requestAcceptsQuery(specifier);
  if (acceptsQuery) {
    let requestNamespace = getNamespace(specifier);
    if (parentNamespace && !requestNamespace) {
      requestNamespace = parentNamespace;
      specifier += `${specifier.includes("?") ? "&" : "?"}${namespaceQuery}${parentNamespace}`;
    }
    if (data.namespace && data.namespace !== requestNamespace) {
      return nextResolve(specifier, context);
    }
    if (isDirectoryPattern.test(specifier)) {
      return await tryDirectory(specifier, context, nextResolve);
    }
  } else if (
    // Bare specifier
    // TS path alias
    tsconfigPathsMatcher && !context.parentURL?.includes("/node_modules/")
  ) {
    const possiblePaths = tsconfigPathsMatcher(specifier);
    for (const possiblePath of possiblePaths) {
      try {
        return await resolve(
          pathToFileURL(possiblePath).toString(),
          context,
          nextResolve
        );
      } catch {
      }
    }
  }
  if ((specifier.startsWith("#") || !isBarePackageName.test(specifier)) && (tsExtensionsPattern.test(context.parentURL) || allowJs)) {
    const resolved = await tryTsPaths(specifier, context, nextResolve);
    if (resolved) {
      return resolved;
    }
  }
  try {
    const resolved = await resolveMissingFormat(
      await nextResolve(specifier, context)
    );
    if (requestAcceptsQuery(resolved.url)) {
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
            const packageJsonUrl = pathToFileURL(packageJsonPath);
            if (!packageJsonUrl.pathname.endsWith("/package.json")) {
              packageJsonUrl.pathname += "/package.json";
            }
            const packageJson = await readJsonFile(packageJsonUrl);
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

if (isFeatureSupported(moduleRegister) && isMainThread) {
  register();
}

export { globalPreload, initialize, load, resolve };
