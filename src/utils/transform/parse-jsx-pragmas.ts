/**
 * Parse JSX pragma comments from source code
 *
 * Supports:
 *   - @jsxImportSource <module>
 *   - @jsx <factory>
 *   - @jsxFrag <fragment>
 *
 * These can appear in block or line comments:
 *   - /** @jsxImportSource react *\/
 *   - // @jsxImportSource react
 */

export type JsxPragmas = {
	jsxImportSource?: string;
	jsxFactory?: string;
	jsxFragmentFactory?: string;
};

/**
 * Match pragmas in comments at the start of a file
 * Captures: [full match, pragma name, pragma value]
 *
 * Matches:
 *   - /** @jsxImportSource react * /
 *   - // @jsxImportSource react
 *   - * @jsx h (inside multi-line block comments)
 */
const jsxPragmaPattern = /(?:\/\*[\s*]*|\/\/\s*|^\s*\*\s*)@(jsxImportSource|jsx|jsxFrag)\s+(\S+)/gm;

export const parseJsxPragmas = (code: string): JsxPragmas | undefined => {
	// Only scan the beginning of the file for pragmas (performance optimization)
	// Pragmas should appear before any actual code
	const head = code.slice(0, 1024);

	let match = jsxPragmaPattern.exec(head);
	let pragmas: JsxPragmas | undefined;

	while (match !== null) {
		const [, pragma, value] = match;
		pragmas ??= {};

		switch (pragma) {
			case 'jsxImportSource': {
				pragmas.jsxImportSource = value;
				break;
			}
			case 'jsx': {
				pragmas.jsxFactory = value;
				break;
			}
			case 'jsxFrag': {
				pragmas.jsxFragmentFactory = value;
				break;
			}
			default: {
				break;
			}
		}

		match = jsxPragmaPattern.exec(head);
	}

	return pragmas;
};
