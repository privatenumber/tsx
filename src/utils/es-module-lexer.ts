import { parse as parseWasm, init } from 'es-module-lexer';
import { parse as parseJs } from 'es-module-lexer/js';

let wasmParserInitialized = false;

// eslint-disable-next-line promise/catch-or-return
init.then(() => {
	wasmParserInitialized = true;
});

export const parseEsm = (code: string) => (
	wasmParserInitialized
		? parseWasm(code)
		: parseJs(code)
);
