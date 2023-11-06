import MagicString from 'magic-string';
import type { RawSourceMap } from '../../source-map';
import { parseEsm } from '../es-module-lexer';

const handlerName = '___tsxInteropDynamicImport';
const handleEsModuleFunction = 'function ' + handlerName + (function (imported: Record<string, unknown>) {
	const exports = Object.keys(imported);
	if (
		exports.length === 1
		&& exports[0] === 'default'
		&& imported.default
		&& imported.default.__esModule
	){
		return imported.default;
	}

	return imported;
}).toString().slice('function'.length);

const handleDynamicImport = `.then(${handlerName})`;

const esmImportPattern = /\bimport\b/;

export const transformDynamicImport = (
	filePath: string,
	code: string,
) => {
	// Naive check
	if (!esmImportPattern.test(code)) {
		return;
	}

	const dynamicImports = parseEsm(code)[0].filter(maybeDynamic => maybeDynamic.d > -1);

	if (dynamicImports.length === 0) {
		return;
	}

	const magicString = new MagicString(code);

	for (const dynamicImport of dynamicImports) {
		magicString.appendRight(dynamicImport.se, handleDynamicImport);
	}

	magicString.append(handleEsModuleFunction);

	const newCode = magicString.toString();
	const newMap = magicString.generateMap({
		source: filePath,
		includeContent: false,

		/**
		 * The performance hit on this is very high
		 * Since we're only transforming import()s, I think this may be overkill
		 */
		// hires: 'boundary',
	}) as unknown as RawSourceMap;

	return {
		code: newCode,
		map: newMap,
	};
};
