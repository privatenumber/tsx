import module from 'node:module';
import { MessageChannel, type MessagePort } from 'node:worker_threads';
import type { Message } from '../types.js';
import type { RequiredProperty } from '../../types.js';
import { interopCjsExports } from '../../cjs/api/module-resolve-filename/interop-cjs-exports.js';
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

export const register: Register = (
	options,
) => {
	if (!module.register) {
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

	const { port1, port2 } = new MessageChannel();
	module.register(
		// Load new copy of loader so it can be registered multiple times
		`./esm/index.mjs?${Date.now()}`,
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
