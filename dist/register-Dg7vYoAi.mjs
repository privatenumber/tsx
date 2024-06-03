import Module from 'node:module';
import { MessageChannel } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';

const resolveSpecifier = (specifier, fromFile, namespace) => {
  const base = fromFile.startsWith("file://") ? fromFile : pathToFileURL(fromFile);
  const resolvedUrl = new URL(specifier, base);
  resolvedUrl.searchParams.set("tsx-namespace", namespace);
  return resolvedUrl.toString();
};
const createScopedImport = (namespace) => (specifier, parentURL) => {
  if (!parentURL) {
    throw new Error("The current file path (import.meta.url) must be provided in the second argument of tsImport()");
  }
  return import(resolveSpecifier(specifier, parentURL, namespace));
};

const register = (options) => {
  if (!Module.register) {
    throw new Error(`This version of Node.js (${process.version}) does not support module.register(). Please upgrade to Node v18.9 or v20.6 and above.`);
  }
  const { sourceMapsEnabled } = process;
  process.setSourceMapsEnabled(true);
  const { port1, port2 } = new MessageChannel();
  Module.register(
    // Load new copy of loader so it can be registered multiple times
    `./esm/index.mjs?${Date.now()}`,
    {
      parentURL: import.meta.url,
      data: {
        port: port2,
        namespace: options?.namespace,
        tsconfig: options?.tsconfig
      },
      transferList: [port2]
    }
  );
  const onImport = options?.onImport;
  const importHandler = onImport && ((message) => {
    if (message.type === "load") {
      onImport(message.url);
    }
  });
  if (importHandler) {
    port1.on("message", importHandler);
    port1.unref();
  }
  const unregister = () => {
    if (sourceMapsEnabled === false) {
      process.setSourceMapsEnabled(false);
    }
    if (importHandler) {
      port1.off("message", importHandler);
    }
    port1.postMessage("deactivate");
    return new Promise((resolve) => {
      const onDeactivated = (message) => {
        if (message.type === "deactivated") {
          resolve();
          port1.off("message", onDeactivated);
        }
      };
      port1.on("message", onDeactivated);
    });
  };
  if (options?.namespace) {
    unregister.import = createScopedImport(options.namespace);
    unregister.unregister = unregister;
  }
  return unregister;
};

export { register as r };
