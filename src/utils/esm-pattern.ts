import { parseEsm } from './es-module-lexer.js';

/*
Previously, this regex was used as a naive ESM catch,
but turns out regex is slower than the lexer so removing
it made the check faster.

Catches:
import a from 'b'
import 'b';
import('b');
export{a};
export default a;

Doesn't catch:
EXPORT{a}
exports.a = 1
module.exports = 1

const esmPattern = /\b(?:import|export)\b/;
*/

export const isESM = (code: string) => {
	if (code.includes('import') || code.includes('export')) {
		try {
			const hasModuleSyntax = parseEsm(code)[3];
			return hasModuleSyntax;
		} catch {
			/**
			 * If it fails to parse, there's a syntax error
			 * Let esbuild handle it for better error messages
			 */
			return true;
		}
	}
	return false;
};
