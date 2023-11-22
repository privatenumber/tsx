import MagicString from 'magic-string';
import { parseEsm } from '../es-module-lexer.js';
import type { SourceMap } from './apply-transformers.js';

export const version = '2';

const toEsmFunctionString = ((imported: Record<string, unknown>) => {
	const d = 'default';
	const exports = Object.keys(imported);
	if (
		exports.length === 1
		&& exports[0] === d
		&& imported[d]
		&& typeof imported[d] === 'object'
		&& '__esModule' in imported[d]
	) {
		return imported[d];
	}

	return imported;
}).toString();

const handleDynamicImport = `.then(${toEsmFunctionString})`;

export const transformDynamicImport = (
	filePath: string,
	code: string,
) => {
	// Naive check (regex is too slow)
	if (!code.includes('import')) {
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

	const newCode = magicString.toString();
	const newMap = magicString.generateMap({
		source: filePath,
		includeContent: false,

		/**
		 * The performance hit on this is very high
		 * Since we're only transforming import()s, I think this may be overkill
		 */
		hires: 'boundary',
	}) as SourceMap;

	return {
		code: newCode,
		map: newMap,
	};
};
