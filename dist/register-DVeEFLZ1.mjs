import { r as require } from './get-pipe-path-D2pYDmQS.mjs';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTsconfig, getTsconfig, createFilesMatcher, createPathsMatcher } from 'get-tsconfig';
import fs from 'node:fs';
import { b as transformDynamicImport, i as isESM, a as transformSync } from './index-CU-y6T80.mjs';
import { p as parent } from './client-Cg5Bp24g.mjs';

const tsExtensions = /* @__PURE__ */ Object.create(null);
tsExtensions[".js"] = [".ts", ".tsx", ".js", ".jsx"];
tsExtensions[".jsx"] = [".tsx", ".ts", ".jsx", ".js"];
tsExtensions[".cjs"] = [".cts"];
tsExtensions[".mjs"] = [".mts"];
const mapTsExtensions = (filePath) => {
  const [pathname, search] = filePath.split("?");
  const extension = path.extname(pathname);
  const possibleExtensions = tsExtensions[extension];
  if (!possibleExtensions) {
    return;
  }
  const extensionlessPath = pathname.slice(0, -extension.length);
  return possibleExtensions.map(
    (tsExtension) => extensionlessPath + tsExtension + (search ? `?${search}` : "")
  );
};

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
const isBarePackageName = /^(?:@[^/]+\/)?[^/]+$/;

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

const urlSearchParamsStringify = (searchParams) => {
  const size = Array.from(searchParams).length;
  return size > 0 ? `?${searchParams.toString()}` : "";
};

const implicitlyResolvableExtensions = [
  ".ts",
  ".tsx",
  ".jsx"
];
const tryExtensions = (resolve, request) => {
  for (const extension of implicitlyResolvableExtensions) {
    try {
      return resolve(request + extension);
    } catch {
    }
  }
};
const createImplicitResolver = (resolve) => (request) => {
  try {
    return resolve(request);
  } catch (_error) {
    const nodeError = _error;
    if (nodeError.code === "MODULE_NOT_FOUND") {
      const resolved = tryExtensions(resolve, request) || tryExtensions(resolve, `${request}${path.sep}index`);
      if (resolved) {
        return resolved;
      }
    }
    throw nodeError;
  }
};

const nodeModulesPath = `${path.sep}node_modules${path.sep}`;
const interopCjsExports = (request) => {
  if (!request.startsWith("data:text/javascript,")) {
    return request;
  }
  const queryIndex = request.indexOf("?");
  if (queryIndex === -1) {
    return request;
  }
  const searchParams = new URLSearchParams(request.slice(queryIndex + 1));
  const filePath = searchParams.get("filePath");
  if (filePath) {
    Module._cache[filePath] = Module._cache[request];
    delete Module._cache[request];
    request = filePath;
  }
  return request;
};
const resolveTsFilename = (resolve, request, parent) => {
  if (!(parent?.filename && tsExtensionsPattern.test(parent.filename)) && !allowJs) {
    return;
  }
  const tsPath = mapTsExtensions(request);
  if (!tsPath) {
    return;
  }
  for (const tryTsPath of tsPath) {
    try {
      return resolve(tryTsPath);
    } catch (error) {
      const { code } = error;
      if (code !== "MODULE_NOT_FOUND" && code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
        throw error;
      }
    }
  }
};
const resolveRequest = (request, parent, resolve) => {
  if (request.startsWith(fileUrlPrefix)) {
    request = fileURLToPath(request);
  }
  if (tsconfigPathsMatcher && !isRelativePath(request) && !parent?.filename?.includes(nodeModulesPath)) {
    const possiblePaths = tsconfigPathsMatcher(request);
    for (const possiblePath of possiblePaths) {
      const tsFilename = resolveTsFilename(resolve, possiblePath, parent);
      if (tsFilename) {
        return tsFilename;
      }
      try {
        return resolve(possiblePath);
      } catch {
      }
    }
  }
  const resolvedTsFilename = resolveTsFilename(resolve, request, parent);
  if (resolvedTsFilename) {
    return resolvedTsFilename;
  }
  try {
    return resolve(request);
  } catch (error) {
    const nodeError = error;
    if (nodeError.code === "MODULE_NOT_FOUND" && typeof nodeError.path === "string" && nodeError.path.endsWith(`${path.sep}package.json`)) {
      const isExportsPath = nodeError.message.match(/^Cannot find module '([^']+)'$/);
      if (isExportsPath) {
        const exportsPath = isExportsPath[1];
        const tsFilename = resolveTsFilename(resolve, exportsPath, parent);
        if (tsFilename) {
          return tsFilename;
        }
      }
      const isMainPath = nodeError.message.match(/^Cannot find module '([^']+)'. Please verify that the package.json has a valid "main" entry$/);
      if (isMainPath) {
        const mainPath = isMainPath[1];
        const tsFilename = resolveTsFilename(resolve, mainPath, parent);
        if (tsFilename) {
          return tsFilename;
        }
      }
    }
    throw nodeError;
  }
};
const createResolveFilename = (nextResolve, namespace) => (request, parent, isMain, options) => {
  let resolve = (request_) => nextResolve(
    request_,
    parent,
    isMain,
    options
  );
  if (namespace) {
    resolve = createImplicitResolver(resolve);
  }
  request = interopCjsExports(request);
  const requestAndQuery = request.split("?");
  const searchParams = new URLSearchParams(requestAndQuery[1]);
  if (parent?.filename) {
    const parentQuery = new URLSearchParams(parent.filename.split("?")[1]);
    const parentNamespace = parentQuery.get("namespace");
    if (parentNamespace) {
      searchParams.append("namespace", parentNamespace);
    }
  }
  if ((searchParams.get("namespace") ?? void 0) !== namespace) {
    return resolve(request);
  }
  let resolved = resolveRequest(requestAndQuery[0], parent, resolve);
  if (path.isAbsolute(resolved)) {
    resolved += urlSearchParamsStringify(searchParams);
  }
  return resolved;
};

const inlineSourceMapPrefix = "\n//# sourceMappingURL=data:application/json;base64,";
const shouldApplySourceMap = () => process.sourceMapsEnabled ?? true;
const inlineSourceMap = ({ code, map }) => code + inlineSourceMapPrefix + Buffer.from(JSON.stringify(map), "utf8").toString("base64");

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
const createExtensions = (extendExtensions, namespace) => {
  const extensions = Object.assign(
    /* @__PURE__ */ Object.create(null),
    extendExtensions
  );
  const defaultLoader = extensions[".js"];
  const transformer = (module, filePath) => {
    const [cleanFilePath, query] = filePath.split("?");
    const searchParams = new URLSearchParams(query);
    if ((searchParams.get("namespace") ?? void 0) !== namespace) {
      return defaultLoader(module, cleanFilePath);
    }
    if (parent?.send) {
      parent.send({
        type: "dependency",
        path: cleanFilePath
      });
    }
    const transformTs = typescriptExtensions.some((extension) => cleanFilePath.endsWith(extension));
    const transformJs = transformExtensions.some((extension) => cleanFilePath.endsWith(extension));
    if (!transformTs && !transformJs) {
      return defaultLoader(module, cleanFilePath);
    }
    let code = fs.readFileSync(cleanFilePath, "utf8");
    if (cleanFilePath.endsWith(".cjs")) {
      const transformed = transformDynamicImport(filePath, code);
      if (transformed) {
        code = shouldApplySourceMap() ? inlineSourceMap(transformed) : transformed.code;
      }
    } else if (transformTs || isESM(code)) {
      const transformed = transformSync(
        code,
        filePath,
        {
          tsconfigRaw: fileMatcher?.(cleanFilePath)
        }
      );
      code = shouldApplySourceMap() ? inlineSourceMap(transformed) : transformed.code;
    }
    module._compile(code, cleanFilePath);
  };
  extensions[".js"] = transformer;
  for (const extension of implicitlyResolvableExtensions) {
    const descriptor = Object.getOwnPropertyDescriptor(extensions, extension);
    Object.defineProperty(extensions, extension, {
      value: transformer,
      /**
       * Registeration needs to be enumerable for some 3rd party libraries
       * https://github.com/gulpjs/rechoir/blob/v0.8.0/index.js#L21 (used by Webpack CLI)
       *
       * If the extension already exists, inherit its enumerable property
       * If not, only expose if it's not namespaced
       */
      enumerable: descriptor?.enumerable || !namespace
    });
  }
  Object.defineProperty(extensions, ".mjs", {
    value: transformer,
    /**
     * Prevent Object.keys from detecting these extensions
     * when CJS loader iterates over the possible extensions
     * https://github.com/nodejs/node/blob/v22.2.0/lib/internal/modules/cjs/loader.js#L609
     */
    enumerable: false
  });
  return extensions;
};

const resolveContext = (id, fromFile) => {
  if (!fromFile) {
    throw new Error("The current file path (__filename or import.meta.url) must be provided in the second argument of tsx.require()");
  }
  if (typeof fromFile === "string" && fromFile.startsWith("file://") || fromFile instanceof URL) {
    fromFile = fileURLToPath(fromFile);
  }
  return path.resolve(path.dirname(fromFile), id);
};
const register = (options) => {
  const { sourceMapsEnabled } = process;
  const { _extensions, _resolveFilename } = Module;
  loadTsconfig(process.env.TSX_TSCONFIG_PATH);
  process.setSourceMapsEnabled(true);
  const resolveFilename = createResolveFilename(_resolveFilename, options?.namespace);
  Module._resolveFilename = resolveFilename;
  const extensions = createExtensions(Module._extensions, options?.namespace);
  Module._extensions = extensions;
  const unregister = () => {
    if (sourceMapsEnabled === false) {
      process.setSourceMapsEnabled(false);
    }
    Module._extensions = _extensions;
    Module._resolveFilename = _resolveFilename;
  };
  if (options?.namespace) {
    const scopedRequire = (id, fromFile) => {
      const resolvedId = resolveContext(id, fromFile);
      const [request, query] = resolvedId.split("?");
      const parameters = new URLSearchParams(query);
      if (options.namespace) {
        parameters.set("namespace", options.namespace);
      }
      return require(request + urlSearchParamsStringify(parameters));
    };
    unregister.require = scopedRequire;
    const scopedResolve = (id, fromFile, resolveOptions) => {
      const resolvedId = resolveContext(id, fromFile);
      const [request, query] = resolvedId.split("?");
      const parameters = new URLSearchParams(query);
      if (options.namespace) {
        parameters.set("namespace", options.namespace);
      }
      return resolveFilename(
        request + urlSearchParamsStringify(parameters),
        module,
        false,
        resolveOptions
      );
    };
    unregister.resolve = scopedResolve;
    unregister.unregister = unregister;
  }
  return unregister;
};

export { isJsonPattern as a, inlineSourceMap as b, requestAcceptsQuery as c, isDirectoryPattern as d, isBarePackageName as e, fileMatcher as f, allowJs as g, fileUrlPrefix as h, interopCjsExports as i, tsconfigPathsMatcher as j, loadTsconfig as l, mapTsExtensions as m, register as r, tsExtensionsPattern as t };
