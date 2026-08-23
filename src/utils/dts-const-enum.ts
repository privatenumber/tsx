import fs from 'node:fs';
import { transformSync as esbuildTransformSync } from 'esbuild';
import { parseEsm } from './es-module-lexer.js';

/**
 * tsc inlines `const enum` members into each consumer at compile time, so the
 * emitted JavaScript never exports them. tsx transforms one file at a time and
 * cannot inline across files, so the enum is materialized on the module that
 * declares it.
 * https://github.com/privatenumber/tsx/issues/321
 */

const declarationExtensions: Record<string, string> = Object.create(null);
declarationExtensions['.js'] = '.d.ts';
declarationExtensions['.mjs'] = '.d.mts';

const getDeclarationPath = (
	filePath: string,
) => {
	const extensionIndex = filePath.lastIndexOf('.');
	if (extensionIndex === -1) {
		return;
	}

	const declarationExtension = declarationExtensions[filePath.slice(extensionIndex)];
	if (!declarationExtension) {
		return;
	}

	return filePath.slice(0, extensionIndex) + declarationExtension;
};

/**
 * `declare` is matched but not carried over: esbuild erases ambient
 * declarations to nothing, and it is the form tsc emits.
 * Created per call so `lastIndex` is never shared across files.
 */
const createConstEnumPattern = () => /\bexport\s+(?:declare\s+)?const\s+enum\s+([$\w]+)\s*\{/g;

const skipQuoted = (
	declarationCode: string,
	start: number,
) => {
	const quote = declarationCode[start];
	let index = start + 1;
	while (
		index < declarationCode.length
		&& declarationCode[index] !== quote
	) {
		index += declarationCode[index] === '\\' ? 2 : 1;
	}
	return index;
};

const skipComment = (
	declarationCode: string,
	start: number,
) => {
	const next = declarationCode[start + 1];
	if (next === '/') {
		return declarationCode.indexOf('\n', start);
	}
	if (next === '*') {
		const commentEnd = declarationCode.indexOf('*/', start + 2);
		return commentEnd === -1 ? -1 : commentEnd + 1;
	}
	return start;
};

// Enum bodies cannot nest braces, but a `}` can sit in a member's string value
// or in JSDoc, so those spans are skipped
const findBodyEnd = (
	declarationCode: string,
	start: number,
) => {
	for (let index = start; index < declarationCode.length; index += 1) {
		const character = declarationCode[index];

		if (character === '}') {
			return index;
		}

		if (character === '"' || character === "'") {
			index = skipQuoted(declarationCode, index);
		} else if (character === '/') {
			index = skipComment(declarationCode, index);
			if (index === -1) {
				return -1;
			}
		}
	}

	return -1;
};

// Exported under an alias so the declared name is never introduced as a
// top-level binding, which would redeclare a same-named local in the module
const localNamePrefix = '__tsxConstEnum';

const extractConstEnums = (
	declarationCode: string,
) => {
	const names: string[] = [];
	const declarations: string[] = [];

	const constEnumPattern = createConstEnumPattern();
	let match = constEnumPattern.exec(declarationCode);
	while (match) {
		const bodyEnd = findBodyEnd(declarationCode, constEnumPattern.lastIndex);
		if (bodyEnd === -1) {
			break;
		}

		const localName = localNamePrefix + names.length;
		const body = declarationCode.slice(constEnumPattern.lastIndex, bodyEnd);
		declarations.push(`const enum ${localName} {${body}}\nexport { ${localName} as ${match[1]} };`);
		names.push(match[1]);

		constEnumPattern.lastIndex = bodyEnd;
		match = constEnumPattern.exec(declarationCode);
	}

	return {
		names,
		declarations,
	};
};

type ConstEnums = {
	names: string[];
	code: string;
};

// Misses are cached too — most modules have no adjacent declaration
const constEnumCache = new Map<string, ConstEnums | undefined>();

const loadConstEnums = (
	filePath: string,
): ConstEnums | undefined => {
	const declarationPath = getDeclarationPath(filePath);
	if (!declarationPath) {
		return;
	}

	if (!fs.existsSync(declarationPath)) {
		return;
	}

	let declarationCode;
	try {
		declarationCode = fs.readFileSync(declarationPath, 'utf8');
	} catch {
		// Removed between the two calls, or unreadable
		return;
	}

	if (!declarationCode.includes('enum')) {
		return;
	}

	const { names, declarations } = extractConstEnums(declarationCode);
	if (names.length === 0) {
		return;
	}

	// One at a time so a malformed declaration only drops itself
	const emitted: string[] = [];
	const emittedNames: string[] = [];
	for (const [index, declaration] of declarations.entries()) {
		try {
			const { code } = esbuildTransformSync(declaration, {
				loader: 'ts',
				format: 'esm',
			});

			if (code) {
				emitted.push(code);
				emittedNames.push(names[index]);
			}
		} catch {}
	}

	if (emitted.length === 0) {
		return;
	}

	return {
		names: emittedNames,
		code: emitted.join('\n'),
	};
};

/**
 * Appending keeps the original lines at their positions so the source map
 * still applies.
 */
export const addDeclaredConstEnums = (
	filePath: string,
	code: string,
) => {
	let constEnums = constEnumCache.get(filePath);
	if (!constEnumCache.has(filePath)) {
		constEnums = loadConstEnums(filePath);
		constEnumCache.set(filePath, constEnums);
	}

	if (!constEnums) {
		return;
	}

	// A real export of the same name wins; appending a second would be a
	// duplicate-export SyntaxError
	try {
		const [, exports] = parseEsm(code, filePath);
		if (exports.some(({ n }) => constEnums!.names.includes(n))) {
			return;
		}
	} catch {
		// Let the module's own syntax error surface
		return;
	}

	return `${code}\n${constEnums.code}`;
};
