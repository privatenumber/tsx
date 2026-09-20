import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { cli } from 'cleye';
import { createFixture } from 'fs-fixture';
import { tmpdir as tsxCacheDirectory } from '../../src/utils/temporary-directory.js';
import { isFeatureSupported, type Version } from '../../src/utils/node-features.js';
import type { SpecifierStyle } from './utils/generate-fixture.js';
import { scenarios, type Scenario } from './utils/scenarios.js';
import { resolveTsx, type TsxImplementation } from './utils/resolve-tsx.js';
import { resolveNode, type NodeBinary } from './utils/resolve-node.js';
import { runOnce, type RunResult } from './utils/run.js';
import { mean, standardDeviation, linearFit } from './utils/stats.js';

const specifierStyles: SpecifierStyle[] = ['ts', 'js', 'extensionless'];
const scaleCounts = [10, 100, 300, 1000];

const argv = cli({
	name: 'benchmark',
	parameters: ['[scenarios...]'],
	help: {
		description: 'Measures tsx startup across scenarios, Node versions, and project sizes',
	},
	flags: {
		compare: {
			type: [String],
			alias: 'c',
			description: 'tsx to compare: npm version (e.g. 4.21.0) or path to a tsx checkout',
			default: () => [] as string[],
		},
		node: {
			type: [String],
			alias: 'n',
			description: 'Additional Node version to test (repeatable); downloaded via get-node',
			default: () => [] as string[],
		},
		modules: {
			type: Number,
			alias: 'm',
			description: 'Module count (ignored with --scale)',
			default: 1000,
		},
		specifier: {
			type: (style: SpecifierStyle) => {
				if (!specifierStyles.includes(style)) {
					throw new Error(`Invalid specifier style: ${style}`);
				}
				return style;
			},
			alias: 's',
			description: `Import specifier style for esm-ts: ${specifierStyles.join(', ')}`,
			default: 'ts' as SpecifierStyle,
		},
		runs: {
			type: Number,
			alias: 'r',
			description: 'Timed runs per cell',
			default: 5,
		},
		cold: {
			type: Boolean,
			description: 'Clear the tsx transform cache before every run',
			default: false,
		},
		cacheEntries: {
			type: Number,
			description: 'Seed an isolated transform cache with unrelated entries',
			default: 0,
		},
		scale: {
			type: Boolean,
			description: `Sweep module counts ${scaleCounts.join('/')} and report per-module cost + fixed tax`,
			default: false,
		},
		json: {
			type: Boolean,
			description: 'Emit raw per-run results as JSON',
			default: false,
		},
	},
});

const {
	compare, node: nodeVersions, modules, specifier, runs, cold, cacheEntries, scale, json,
} = argv.flags;

if (cacheEntries < 0 || !Number.isInteger(cacheEntries)) {
	throw new Error('--cache-entries must be a non-negative integer');
}
if (cacheEntries > 0 && cold) {
	throw new Error('--cache-entries cannot be combined with --cold');
}

const selectedScenarios = (
	argv._.scenarios.length > 0
		? argv._.scenarios.map((name) => {
			const scenario = scenarios.find(s => s.name === name);
			if (!scenario) {
				throw new Error(`Unknown scenario "${name}". Available: ${scenarios.map(s => s.name).join(', ')}`);
			}
			return scenario;
		})
		: scenarios.filter(scenario => scenario.default)
);

const moduleCounts = scale ? scaleCounts : [modules];
const log = (message = '') => process.stderr.write(`${message}\n`);
const out = (message = '') => process.stdout.write(`${message}\n`);

const clearTransformCache = () => fs.rm(tsxCacheDirectory, {
	recursive: true,
	force: true,
});

const userId = process.geteuid ? process.geteuid() : os.userInfo().username;
const seedCache = async (temporaryDirectory: string) => {
	const time = Math.floor(Date.now() / 1e8);
	const cacheDirectory = path.join(temporaryDirectory, `tsx-${userId}`);
	await fs.mkdir(cacheDirectory, { recursive: true });

	// Bound concurrent writes so large cache fixtures don't exhaust file descriptors.
	for (let start = 0; start < cacheEntries; start += 500) {
		const end = Math.min(start + 500, cacheEntries);
		await Promise.all(Array.from(
			{ length: end - start },
			(_, offset) => fs.writeFile(
				path.join(
					cacheDirectory,
					`${time}-${(start + offset).toString(16).padStart(40, '0')}`,
				),
				'{}',
			),
		));
	}

	// Share seeded files with implementations that use the unscoped cache path.
	await fs.symlink(cacheDirectory, path.join(temporaryDirectory, 'tsx'), 'junction');
};

const prepareTransformCache = async (
	runsTsx: boolean,
	isolatedCacheDirectory?: string,
) => {
	if (isolatedCacheDirectory) {
		await seedCache(isolatedCacheDirectory);
		return;
	}

	if (runsTsx) {
		await clearTransformCache();
	}
};

type Row = {
	scenario: string;
	nodeVersion: string;
	impl: string;
	moduleCount: number;
	results: RunResult[];
};

const measureCell = async (
	scenario: Scenario,
	node: NodeBinary,
	cliPath: string,
	fixturePath: string,
): Promise<RunResult[]> => {
	const entryPath = path.join(fixturePath, scenario.entry);
	const args = scenario.runner === 'tsx' ? [cliPath, entryPath] : [entryPath];
	const runsTsx = scenario.runner === 'tsx';
	await using cacheFixture = runsTsx && cacheEntries > 0
		? await createFixture()
		: undefined;
	const cacheEnvironment = cacheFixture
		? {
			TMPDIR: cacheFixture.path,
			TEMP: cacheFixture.path,
			TMP: cacheFixture.path,
		}
		: undefined;

	// Isolated mode retains its directory through warmup and timed runs.
	await prepareTransformCache(runsTsx, cacheFixture?.path);
	await runOnce(node.path, args, fixturePath, cacheEnvironment);

	const results: RunResult[] = [];
	for (let run = 0; run < runs; run += 1) {
		if (runsTsx && cold) {
			await clearTransformCache();
		}
		results.push(await runOnce(node.path, args, fixturePath, cacheEnvironment));
	}
	return results;
};

// Resolve Node binaries (current + any --node), de-duplicated by version
const nodeBinaries: NodeBinary[] = [];
const resolvedBinaries = await Promise.all([
	resolveNode(),
	...nodeVersions.map(version => resolveNode(version)),
]);
for (const binary of resolvedBinaries) {
	if (!nodeBinaries.some(existing => existing.version === binary.version)) {
		nodeBinaries.push(binary);
	}
}

// tsx implementations: local + comparisons (npm/path)
await using installRoot = await createFixture();
const implementations: TsxImplementation[] = [
	{
		name: 'local',
		cliPath: fileURLToPath(new URL('../../dist/cli.mjs', import.meta.url)),
	},
	...await Promise.all(
		compare.map(comparison => resolveTsx(comparison, installRoot.path)),
	),
];

const rows: Row[] = [];
const skipped: string[] = [];

// Measurements are intentionally sequential: concurrent child processes
// would contend for CPU and corrupt the timings.
for (const scenario of selectedScenarios) {
	// Build each fixture once per module count; reuse across nodes and cells
	const fixtures = await Promise.all(moduleCounts.map(
		moduleCount => createFixture(scenario.build(moduleCount, specifier)),
	));
	await using _scenarioFixtures = {
		[Symbol.asyncDispose]: async () => {
			await Promise.all(fixtures.map(fixture => fixture.rm()));
		},
	};

	for (const node of nodeBinaries) {
		if (
			scenario.supportedNodeVersions
			&& !isFeatureSupported(
				scenario.supportedNodeVersions,
				node.version.split('.').map(Number) as Version,
			)
		) {
			skipped.push(`${scenario.name} on Node ${node.version} (unsupported)`);
			continue;
		}

		// node-runner scenarios (baseline/native) ignore --compare
		const cells = (
			scenario.runner === 'node'
				? [{
					name: 'node',
					cliPath: '',
				}]
				: implementations
		);
		for (const { name, cliPath } of cells) {
			for (const [index, moduleCount] of moduleCounts.entries()) {
				log(`  ${scenario.name} · Node ${node.version} · ${name} · ${moduleCount} modules`);
				const results = await measureCell(scenario, node, cliPath, fixtures[index].path);
				rows.push({
					scenario: scenario.name,
					nodeVersion: node.version,
					impl: name,
					moduleCount,
					results,
				});
			}
		}
	}
}

if (json) {
	process.stdout.write(`${JSON.stringify({
		meta: {
			runs,
			cold,
			cacheEntries,
			scale,
			specifier,
		},
		rows,
	}, null, 2)}\n`);
} else {
	renderTables();
}

function renderTables() {
	out();
	out(
		`${runs} runs/cell · ${cold ? 'cold' : 'warm'} cache`
		+ ` · tsx scenarios: ${cacheEntries} unrelated cache entries`
		+ ` · specifier=${specifier}`,
	);

	for (const scenario of selectedScenarios) {
		const scenarioRows = rows.filter(row => row.scenario === scenario.name);
		if (scenarioRows.length === 0) {
			continue;
		}
		out(`\n## ${scenario.name} — ${scenario.description}`);

		const byNode = new Map<string, Row[]>();
		for (const row of scenarioRows) {
			const list = byNode.get(row.nodeVersion) ?? [];
			list.push(row);
			byNode.set(row.nodeVersion, list);
		}

		for (const [nodeVersion, nodeRows] of byNode) {
			if (scale) {
				out(`Node ${nodeVersion} — scale ${scaleCounts.join('/')}:`);
				const byImpl = new Map<string, Row[]>();
				for (const row of nodeRows) {
					const list = byImpl.get(row.impl) ?? [];
					list.push(row);
					byImpl.set(row.impl, list);
				}
				for (const [impl, implRows] of byImpl) {
					const points = implRows.map(row => ({
						x: row.moduleCount,
						y: mean(row.results.map(result => result.wallMs)),
					}));
					const { slope, intercept } = linearFit(points);
					const detail = points
						.slice()
						.sort((a, b) => a.x - b.x)
						.map(point => `${point.x}→${point.y.toFixed(0)}ms`)
						.join(' ');
					out(`  ${impl.padEnd(20)} ${(slope * 1000).toFixed(1)}µs/module  +${intercept.toFixed(0)}ms fixed   [${detail}]`);
				}
			} else {
				const [count] = moduleCounts;
				out(`Node ${nodeVersion} — ${count} modules:`);
				const localMean = mean(
					(nodeRows.find(row => row.impl === 'local') ?? nodeRows[0])
						.results.map(result => result.wallMs),
				);
				for (const row of nodeRows) {
					// wall is the headline signal; RSS + load/eval split carry little
					// independent signal on synthetic trees (see README) — JSON only.
					const wall = row.results.map(result => result.wallMs);
					const wallMean = mean(wall);
					const relative = (
						row.impl === 'local' || scenario.runner === 'node'
							? ''
							: `  (${(wallMean / localMean).toFixed(2)}x)`
					);
					const name = row.impl.padEnd(20);
					const meanColumn = `mean ${wallMean.toFixed(0)}±${standardDeviation(wall).toFixed(0)}ms`.padEnd(18);
					const minColumn = `min ${Math.min(...wall).toFixed(0)}ms`;
					out(`  ${name}${meanColumn}${minColumn}${relative}`);
				}
			}
		}
	}

	if (skipped.length > 0) {
		out(`\nSkipped:\n${skipped.map(entry => `  ${entry}`).join('\n')}`);
	}
}
