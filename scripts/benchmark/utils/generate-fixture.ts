import type { FileTree } from 'fs-fixture';

export type SpecifierStyle = 'ts' | 'js' | 'extensionless';

const specifierByStyle: Record<SpecifierStyle, (moduleName: string) => string> = {
	ts: moduleName => `./${moduleName}.ts`,
	js: moduleName => `./${moduleName}.js`,
	extensionless: moduleName => `./${moduleName}`,
};

/**
 * A module records a high-resolution timestamp when its body first evaluates.
 * ESM evaluates post-order, so the earliest timestamp marks "graph fully
 * loaded/transformed" and the entry's final timestamp marks "graph fully
 * evaluated" — letting the runner split load vs eval time.
 */
const evalMark = '(globalThis.__bench ??= []).push(performance.now());';

/**
 * Printed as the last stdout line by every scenario entry. The runner parses it.
 * maxRSS is kilobytes (Node normalizes `resourceUsage().maxRSS` to KB).
 */
export const metricsReporter = `{
	const __t = globalThis.__bench ?? [];
	const __now = performance.now();
	console.log('__BENCH__' + JSON.stringify({
		first: __t.length > 0 ? Math.min(...__t) : __now,
		last: __now,
		maxRssKb: process.resourceUsage().maxRSS,
	}));
}`;

const childrenOf = (index: number, moduleCount: number) => (
	[(index * 3) + 1, (index * 3) + 2, (index * 3) + 3].filter(child => child < moduleCount)
);

/**
 * A tree of TypeScript modules, each importing up to 3 children (ESM import).
 * `specifierStyle` controls how children are referenced, exercising different
 * resolution paths. Mirrors the shape reported in
 * https://github.com/privatenumber/tsx/issues/809
 */
export const esmTree = (
	moduleCount: number,
	specifierStyle: SpecifierStyle,
): FileTree => {
	const toSpecifier = specifierByStyle[specifierStyle];
	const files: FileTree = {};

	for (let i = 0; i < moduleCount; i += 1) {
		const children = childrenOf(i, moduleCount);
		const imports = children.map(
			(child, index) => `import { value as v${index} } from '${toSpecifier(`module-${child}`)}';`,
		).join('\n');
		const value = children.length > 0 ? children.map((_, index) => `v${index}`).join(' + ') : '1';
		files[`module-${i}.ts`] = `${imports}\n${evalMark}\ntype Value = number;\nexport const value: Value = ${value};\n`;
	}

	files['main.ts'] = `import { value } from '${toSpecifier('module-0')}';\nconsole.log('total', value);\n${metricsReporter}\n`;
	return files;
};

/**
 * Same tree shape as `esmTree`, but plain JavaScript (no types). Used to
 * measure hook registration + pass-through resolve/load with zero transforms.
 */
export const jsTree = (
	moduleCount: number,
): FileTree => {
	const files: FileTree = {};

	for (let i = 0; i < moduleCount; i += 1) {
		const children = childrenOf(i, moduleCount);
		const imports = children.map(
			(child, index) => `import { value as v${index} } from './module-${child}.mjs';`,
		).join('\n');
		const value = children.length > 0 ? children.map((_, index) => `v${index}`).join(' + ') : '1';
		files[`module-${i}.mjs`] = `${imports}\n${evalMark}\nexport const value = ${value};\n`;
	}

	files['main.mjs'] = `import { value } from './module-0.mjs';\nconsole.log('total', value);\n${metricsReporter}\n`;
	return files;
};

/**
 * A tree of TypeScript modules wired with CommonJS require/module.exports,
 * to exercise the tsx/cjs require path.
 */
export const cjsTree = (
	moduleCount: number,
): FileTree => {
	const files: FileTree = {};

	for (let i = 0; i < moduleCount; i += 1) {
		const children = childrenOf(i, moduleCount);
		const requires = children.map(
			(child, index) => `const { value: v${index} } = require('./module-${child}.ts');`,
		).join('\n');
		const value = children.length > 0 ? children.map((_, index) => `v${index}`).join(' + ') : '1';
		files[`module-${i}.ts`] = `${requires}\n${evalMark}\nconst value: number = ${value};\nmodule.exports = { value };\n`;
	}

	files['main.ts'] = `const { value } = require('./module-0.ts');\nconsole.log('total', value);\n${metricsReporter}\n`;
	return files;
};

/**
 * An ESM project that imports N generated CommonJS packages from node_modules,
 * exercising the ESM->CJS interop load-hook path (the surface #809 profiled).
 */
export const interopTree = (
	moduleCount: number,
): FileTree => {
	const packages: FileTree = {};
	const imports: string[] = [];
	const sumTerms: string[] = [];

	for (let i = 0; i < moduleCount; i += 1) {
		packages[`dep-${i}`] = {
			'package.json': JSON.stringify({
				name: `dep-${i}`,
				version: '1.0.0',
				main: 'index.js',
			}),
			// `exports.value =` is statically detectable by cjs-module-lexer,
			// so the ESM side can bind it as a named import.
			'index.js': `exports.value = ${i};\n`,
		};
		imports.push(`import { value as v${i} } from 'dep-${i}';`);
		sumTerms.push(`v${i}`);
	}

	return {
		'package.json': JSON.stringify({ type: 'module' }),
		node_modules: packages,
		'main.ts': `${imports.join('\n')}\nconsole.log('total', ${sumTerms.join(' + ')});\n${metricsReporter}\n`,
	};
};

export const tsconfigForTree: FileTree = {
	'tsconfig.json': JSON.stringify({
		compilerOptions: {
			module: 'ESNext',
			moduleResolution: 'Bundler',
			allowImportingTsExtensions: true,
			allowJs: true,
			noEmit: true,
		},
	}),
};
