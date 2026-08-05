import crypto from 'node:crypto';
import module from 'node:module';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import type { Message } from '../types.js';
import type { RequiredProperty } from '../../types.js';
import { isFeatureSupported, moduleRegisterHooksCjsReload } from '../../utils/node-features.js';
import { interopCjsExports } from '../../cjs/api/module-resolve-filename/interop-cjs-exports.js';
import { createData } from '../hook/initialize.js';
import { createLoadSync } from '../hook/load.js';
import { createResolveSync } from '../hook/resolve.js';
import { createScopedImport, type ScopedImport } from './scoped-import.js';

export type TsconfigOptions = false | string;

export type InitializationOptions = {
	namespace?: string;
	port?: MessagePort;
	tsconfig?: TsconfigOptions;
};

export type RegisterOptions = {
	namespace?: string;
	onImport?: (url: string) => void;
	tsconfig?: TsconfigOptions;
};

export type Unregister = () => Promise<void>;

export type NamespacedUnregister = Unregister & {
	import: ScopedImport;
	unregister: Unregister;
};

export type Register = {
	(options: RequiredProperty<RegisterOptions, 'namespace'>): NamespacedUnregister;
	(options?: RegisterOptions): Unregister;
};

let cjsInteropApplied = false;

const collectImportSpecifiers = (
	argv: string[],
) => {
	const imports: string[] = [];

	for (let index = 0; index < argv.length; index += 1) {
		const argument = argv[index]!;
		if (argument === '--import') {
			const specifier = argv[index + 1];
			if (specifier) {
				imports.push(specifier);
			}
			index += 1;
		} else if (argument.startsWith('--import=')) {
			imports.push(argument.slice('--import='.length));
		}
	}

	return imports;
};

const collectNodeOptionsImportSpecifiers = () => [
	...(process.env.NODE_OPTIONS ?? '').matchAll(/(?:^|\s)--import(?:=|\s+)(\S+)/g),
].map(([, specifier]) => specifier!);

const tsxImportUrls = [
	// pkgroll emits this register chunk in dist/, next to loader.mjs.
	new URL('loader.mjs', import.meta.url).toString(),
	new URL('esm/index.mjs', import.meta.url).toString(),
];

const tsxImportSpecifiers = new Set([
	'tsx',
	'tsx/esm',
	...tsxImportUrls,
	...tsxImportUrls.map(url => decodeURI(new URL(url).pathname)),
]);

const isTsxImport = (
	specifier: string,
) => tsxImportSpecifiers.has(specifier);

const isTypeScriptImport = (
	specifier: string,
) => /\.(?:[cm]?ts|tsx)(?:[?#].*)?$/.test(specifier);

const hasCliTypeScriptPreload = () => {
	const imports = collectImportSpecifiers(process.execArgv);
	const tsxImportIndex = imports.findIndex(isTsxImport);
	return tsxImportIndex > 0 && imports.slice(0, tsxImportIndex).some(isTypeScriptImport);
};

const hasTypeScriptPreloadedImport = (
	collectNodeOptionsImportSpecifiers().some(isTypeScriptImport)
	|| hasCliTypeScriptPreload()
);

const supportsRegisterHooks = (
	typeof module.registerHooks === 'function'
	&& isFeatureSupported(moduleRegisterHooksCjsReload)
	// Node does not expose whether a preload installed async hooks. The
	// failing shape needs a TypeScript preload before tsx, so keep the
	// async path scoped there to preserve sync registerHooks composition.
	// https://github.com/nodejs/node/blob/v26.0.0/doc/api/module.md#asynchronous-customization-hooks
	&& !hasTypeScriptPreloadedImport
);

export const register: Register = (
	options,
) => {
	if (!module.register && !supportsRegisterHooks) {
		throw new Error(`This version of Node.js (${process.version}) does not support module.register(). Please upgrade to Node v18.19 or v20.6 and above.`);
	}

	if (!cjsInteropApplied) {
		const { _resolveFilename } = module;
		module._resolveFilename = (
			request,
			...restOfArgs
		) => _resolveFilename(
			interopCjsExports(request),
			...restOfArgs,
		);
		cjsInteropApplied = true;
	}

	const { sourceMapsEnabled } = process;
	process.setSourceMapsEnabled(true);

	if (supportsRegisterHooks) {
		const hookData = createData({
			namespace: options?.namespace,
			onImport: options?.onImport,
			tsconfig: options?.tsconfig,
		});
		const registeredHooks = module.registerHooks({
			load: createLoadSync(hookData),
			resolve: createResolveSync(hookData),
		});

		const unregister = (async () => {
			hookData.active = false;
			registeredHooks.deregister();

			if (sourceMapsEnabled === false) {
				process.setSourceMapsEnabled(false);
			}
		}) as NamespacedUnregister;

		if (options?.namespace) {
			unregister.import = createScopedImport(options.namespace);
			unregister.unregister = unregister;
		}

		return unregister;
	}

	const { port1, port2 } = new MessageChannel();
	module.register(
		// Load new copy of loader so it can be registered multiple times
		`./esm/index.mjs?${crypto.randomUUID()}`,
		{
			parentURL: import.meta.url,
			data: {
				port: port2,
				namespace: options?.namespace,
				tsconfig: options?.tsconfig,
			} satisfies InitializationOptions,
			transferList: [port2],
		},
	);

	const onImport = options?.onImport;
	const importHandler = onImport && ((message: Message) => {
		if (message.type === 'load') {
			onImport(message.url);
		}
	});

	if (importHandler) {
		port1.on('message', importHandler);
		port1.unref();
	}

	// unregister
	const unregister = () => {
		if (sourceMapsEnabled === false) {
			process.setSourceMapsEnabled(false);
		}

		if (importHandler) {
			port1.off('message', importHandler);
		}

		port1.postMessage('deactivate');

		// Not necessary to wait, but provide the option
		return new Promise<void>((resolve) => {
			const onDeactivated = (message: Message) => {
				if (message.type === 'deactivated') {
					resolve();
					port1.off('message', onDeactivated);
				}
			};
			port1.on('message', onDeactivated);
		});
	};

	if (options?.namespace) {
		unregister.import = createScopedImport(options.namespace);
		unregister.unregister = unregister;
	}

	return unregister;
};
