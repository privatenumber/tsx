import MagicString from 'magic-string';
import type { RawSourceMap } from '../../source-map';
import { parseEsm } from '../es-module-lexer';

const checkEsModule = `.then((mod)=>{
	const exports = Object.keys(mod);
	if(
		exports.length===1&&exports[0]==='default'&&mod.default&&mod.default.__esModule
	){
		return mod.default
	}
	return mod
})`
	// replaceAll is not supported in Node 12
	// eslint-disable-next-line unicorn/prefer-string-replace-all
	.replace(/[\n\t]+/g, '');

export function transformDynamicImport(
	filePath: string,
	code: string,
) {
	// Naive check
	if (!code.includes('import')) {
		return;
	}

	const dynamicImports = parseEsm(code)[0].filter(maybeDynamic => maybeDynamic.d > -1);

	if (dynamicImports.length === 0) {
		return;
	}

	const magicString = new MagicString(code);

	for (const dynamicImport of dynamicImports) {
		magicString.appendRight(dynamicImport.se, checkEsModule);
	}

	return {
		code: magicString.toString(),
		map: magicString.generateMap({
			source: filePath,
			hires: true,
		}) as unknown as RawSourceMap,
	};
}
