import { describe, test, expect } from 'manten';
import { createNodeCapabilities } from '../../src/platform/node-capabilities.js';

export const nodeCapabilitiesSpec = () => describe('Node capabilities', () => {
	test('reports the current Node 18 test support facts', () => {
		expect(createNodeCapabilities([18, 20, 5])).toEqual({
			cli: {
				testFlag: true,
				testRunnerGlob: false,
			},
			commonJs: {
				requireEsm: false,
				requireEsmExtensionlessMjs: false,
				requireEsmNoWarning: false,
			},
			esm: {
				cjsNamespaceFromLoadHook: false,
				cjsNamespaceIncludesModuleExports: false,
				importAttributes: true,
				importMetaPathProperties: false,
				loadHookCanReadFile: false,
			},
			moduleApis: {
				register: true,
				registerHooksCanReloadCjs: false,
			},
			moduleResolution: {
				packageMainResolution: true,
			},
			typeScript: {
				nativeTypeScript: false,
			},
			webAssembly: {
				modules: false,
			},
		});
	});

	test('keeps CommonJS and ESM boundary facts independent', () => {
		expect(createNodeCapabilities([20, 18, 0])).toMatchObject({
			commonJs: {
				requireEsm: false,
				requireEsmExtensionlessMjs: false,
				requireEsmNoWarning: false,
			},
			esm: {
				cjsNamespaceFromLoadHook: true,
				importAttributes: true,
				importMetaPathProperties: true,
				loadHookCanReadFile: true,
			},
		});

		expect(createNodeCapabilities([20, 19, 0])).toMatchObject({
			commonJs: {
				requireEsm: true,
				requireEsmExtensionlessMjs: true,
				requireEsmNoWarning: true,
			},
			esm: {
				cjsNamespaceFromLoadHook: true,
				importAttributes: true,
				importMetaPathProperties: true,
				loadHookCanReadFile: true,
			},
		});

		expect(createNodeCapabilities([20, 19, 5]).commonJs.requireEsmExtensionlessMjs).toBe(false);
		expect(createNodeCapabilities([20, 9, 0]).esm.importAttributes).toBe(false);
		expect(createNodeCapabilities([20, 10, 0]).esm.importAttributes).toBe(true);
	});

	test('reports newer platform facts without selecting tsx behavior', () => {
		expect(createNodeCapabilities([22, 18, 0])).toMatchObject({
			esm: {
				cjsNamespaceIncludesModuleExports: false,
			},
			moduleApis: {
				registerHooksCanReloadCjs: false,
			},
			typeScript: {
				nativeTypeScript: true,
			},
			webAssembly: {
				modules: false,
			},
		});

		expect(createNodeCapabilities([22, 19, 0]).webAssembly.modules).toBe(true);
		expect(createNodeCapabilities([23, 0, 0]).esm.cjsNamespaceIncludesModuleExports).toBe(true);
		expect(createNodeCapabilities([24, 11, 0]).moduleApis.registerHooksCanReloadCjs).toBe(false);
		expect(createNodeCapabilities([24, 11, 1]).moduleApis.registerHooksCanReloadCjs).toBe(true);
	});
});
