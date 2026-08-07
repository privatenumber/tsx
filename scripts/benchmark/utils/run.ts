import { performance } from 'node:perf_hooks';
import { execa } from 'execa';

export type RunResult = {

	/** Parent-measured wall time: spawn -> exit. */
	wallMs: number;

	/** Peak RSS in kilobytes (Node's resourceUsage().maxRSS). */
	maxRssKb: number;

	/** Time to first module evaluation ≈ bootstrap + graph load/transform. */
	loadMs: number;

	/** First-to-last evaluation ≈ evaluating the transformed graph. */
	evalMs: number;
};

type BenchLine = {
	first: number;
	last: number;
	maxRssKb: number;
};

const parseBenchLine = (stdout: string): BenchLine | undefined => {
	const line = stdout.split('\n').reverse().find(
		candidate => candidate.startsWith('__BENCH__'),
	);
	if (!line) {
		return;
	}
	return JSON.parse(line.slice('__BENCH__'.length)) as BenchLine;
};

export const runOnce = async (
	nodePath: string,
	args: string[],
	cwd: string,
	env?: NodeJS.ProcessEnv,
): Promise<RunResult> => {
	const startTime = performance.now();
	const result = await execa(nodePath, args, {
		cwd,
		env,
		reject: false,
	});
	const wallMs = performance.now() - startTime;

	if (result.exitCode !== 0) {
		throw new Error(`Run failed (exit ${result.exitCode}):\n${result.stderr}`);
	}

	const parsed = parseBenchLine(result.stdout);
	return {
		wallMs,
		maxRssKb: parsed?.maxRssKb ?? 0,
		loadMs: parsed?.first ?? 0,
		evalMs: parsed ? parsed.last - parsed.first : 0,
	};
};
