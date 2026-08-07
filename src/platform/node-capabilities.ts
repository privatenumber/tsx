import {
	cjsNamespaceFromLoadHook,
	cjsNamespaceModuleExports,
	cliTestFlag,
	esmLoadReadFile,
	importAttributes,
	importMetaPathProperties,
	isFeatureSupported,
	isFeatureSupportedInRange,
	modulePackageMainResolution,
	moduleRegister,
	moduleRegisterHooksCjsReload,
	nativeTypeScript,
	requireEsm,
	requireEsmExtensionlessMjs,
	requireEsmNoWarning,
	testRunnerGlob,
	wasmModules,
	type Version,
} from '../utils/node-features.js';

export type NodeCapabilities = {
	cli: {
		testFlag: boolean;
		testRunnerGlob: boolean;
	};
	commonJs: {
		requireEsm: boolean;
		requireEsmExtensionlessMjs: boolean;
		requireEsmNoWarning: boolean;
	};
	esm: {
		cjsNamespaceFromLoadHook: boolean;
		cjsNamespaceIncludesModuleExports: boolean;
		importAttributes: boolean;
		importMetaPathProperties: boolean;
		loadHookCanReadFile: boolean;
	};
	moduleApis: {
		register: boolean;
		registerHooksCanReloadCjs: boolean;
	};
	moduleResolution: {
		packageMainResolution: boolean;
	};
	typeScript: {
		nativeTypeScript: boolean;
	};
	webAssembly: {
		modules: boolean;
	};
};

export const createNodeCapabilities = (
	current?: Version,
): NodeCapabilities => ({
	cli: {
		testFlag: isFeatureSupported(cliTestFlag, current),
		testRunnerGlob: isFeatureSupported(testRunnerGlob, current),
	},
	commonJs: {
		requireEsm: isFeatureSupported(requireEsm, current),
		requireEsmExtensionlessMjs: isFeatureSupportedInRange(
			requireEsmExtensionlessMjs,
			current,
		),
		requireEsmNoWarning: isFeatureSupported(requireEsmNoWarning, current),
	},
	esm: {
		cjsNamespaceFromLoadHook: isFeatureSupportedInRange(cjsNamespaceFromLoadHook, current),
		cjsNamespaceIncludesModuleExports: isFeatureSupported(cjsNamespaceModuleExports, current),
		importAttributes: isFeatureSupported(importAttributes, current),
		importMetaPathProperties: isFeatureSupported(importMetaPathProperties, current),
		loadHookCanReadFile: isFeatureSupported(esmLoadReadFile, current),
	},
	moduleApis: {
		register: isFeatureSupported(moduleRegister, current),
		registerHooksCanReloadCjs: isFeatureSupported(moduleRegisterHooksCjsReload, current),
	},
	moduleResolution: {
		packageMainResolution: isFeatureSupported(modulePackageMainResolution, current),
	},
	typeScript: {
		nativeTypeScript: isFeatureSupported(nativeTypeScript, current),
	},
	webAssembly: {
		modules: isFeatureSupported(wasmModules, current),
	},
});
