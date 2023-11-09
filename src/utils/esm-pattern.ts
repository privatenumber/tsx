import { parseEsm } from './es-module-lexer';

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
		const [imports, exports] = parseEsm(code);
		return imports.length > 0 || exports.length > 0;
	}
	return false;
};
