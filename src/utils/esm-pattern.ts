import { parseEsm } from './es-module-lexer';

/*
TODO: Add tests
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
 */
const esmPattern = /\b(?:import|export)\b/;

export const isESM = (code: string) => {
	if (esmPattern.test(code)) {
		const [imports, exports] = parseEsm(code);
		return imports.length > 0 || exports.length > 0;
	}
	return false;
};
