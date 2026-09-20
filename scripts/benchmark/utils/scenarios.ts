import type { FileTree } from 'fs-fixture';
import { nativeTypeScript, type Version } from '../../../src/utils/node-features.js';
import {
	esmTree,
	jsTree,
	cjsTree,
	interopTree,
	tsconfigForTree,
	metricsReporter,
	type SpecifierStyle,
} from './generate-fixture.js';

export type Scenario = {
	name: string;
	description: string;

	/** Builds the fixture file tree for a given module count + specifier style. */
	build: (moduleCount: number, specifierStyle: SpecifierStyle) => FileTree;

	/** Entry file, relative to the fixture root. */
	entry: string;

	/**
	 * `tsx` runs the entry through the tsx CLI (or a compared tsx).
	 * `node` runs it with plain Node (floor / native type stripping);
	 * these ignore `--compare`.
	 */
	runner: 'tsx' | 'node';

	/**
	 * Node versions the scenario requires, in `node-features.ts` gate format
	 * (checked with `isFeatureSupported`); skipped on unsupported versions.
	 */
	supportedNodeVersions?: Version[];

	/**
	 * Whether this runs when no scenario is named. The default set is the
	 * data-driven high-signal subset (see scripts/benchmark/README.md);
	 * lower-signal / specialized scenarios stay opt-in by name.
	 */
	default: boolean;
};

export const scenarios: Scenario[] = [
	{
		name: 'node-baseline',
		default: true,
		description: 'Plain Node on an empty module — the absolute startup floor (ignores --compare)',
		build: () => ({ 'main.mjs': `${metricsReporter}\n` }),
		entry: 'main.mjs',
		runner: 'node',
	},
	{
		name: 'hooks-passthrough',
		default: true,
		description: 'tsx on a plain-JS tree — hook registration + pass-through resolve/load, zero transforms',
		build: moduleCount => jsTree(moduleCount),
		entry: 'main.mjs',
		runner: 'tsx',
	},
	{
		name: 'esm-ts',
		default: true,
		description: 'tsx on a TypeScript ESM tree — transform + resolution hot path (--specifier applies)',
		build: (moduleCount, specifierStyle) => ({
			...tsconfigForTree,
			'package.json': JSON.stringify({ type: 'module' }),
			...esmTree(moduleCount, specifierStyle),
		}),
		entry: 'main.ts',
		runner: 'tsx',
	},
	{
		name: 'cjs-require',
		default: false,
		description: 'tsx on a CommonJS TypeScript tree — the tsx/cjs require path',
		build: moduleCount => ({
			...tsconfigForTree,
			'package.json': JSON.stringify({ type: 'commonjs' }),
			...cjsTree(moduleCount),
		}),
		entry: 'main.ts',
		runner: 'tsx',
	},
	{
		name: 'cjs-interop',
		default: false,
		description: 'tsx on ESM importing N CommonJS node_modules packages — the interop load-hook path',
		build: moduleCount => interopTree(moduleCount),
		entry: 'main.ts',
		runner: 'tsx',
	},
	{
		name: 'native-ts',
		default: true,
		description: "Node's native type stripping on the TS tree — reference floor (ignores --compare)",
		build: moduleCount => ({
			...tsconfigForTree,
			'package.json': JSON.stringify({ type: 'module' }),
			...esmTree(moduleCount, 'ts'),
		}),
		entry: 'main.ts',
		runner: 'node',
		supportedNodeVersions: nativeTypeScript,
	},
];
