import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';

/**
 * Resolution priority guards for the #809 fix.
 *
 * tsx resolves TypeScript extensions by mapping a specifier to candidate
 * paths. Before the fix, a specifier that already ended in a TS extension
 * (e.g. `./x.ts`) generated appended-extension guesses (`x.ts.ts`, ...) that
 * were probed BEFORE the literal path fell through to Node. When a file
 * literally named `x.ts.ts` existed, the guess shadowed the real `x.ts`.
 *
 * The fix aligns tsx with the model esbuild and tsc use: swap a known JS
 * extension (`.js` -> `.ts`) and append only to extension-less specifiers;
 * never append onto an existing extension (so never `x.ts.ts`).
 * https://github.com/evanw/esbuild/issues/3201
 *
 * These tests lock that precedence for both loaders, and close the
 * `index.tsx` / `index.tsx.ts` TODO previously in fixtures.ts.
 */
const expectCorrect = (result: { stdout: string }) => {
	expect(result.stdout).toMatch(/(^|\n)CORRECT($|\n)/);
	expect(result.stdout).not.toMatch(/WRONG/);
};

export const resolutionPriority = (
	node: NodeApis,
) => describe('resolution priority', () => {
	describe('verbatim TS extension wins over appended-guess file', () => {
		test('.ts (ESM)', async () => {
			await using fixture = await createFixture({
				'entry.ts': "import './target.ts';",
				'target.ts': "console.log('CORRECT');",
				'target.ts.ts': "console.log('WRONG');",
			});
			expectCorrect(await node.tsx(['./entry.ts'], fixture.path));
		});

		test('.ts (CJS)', async () => {
			await using fixture = await createFixture({
				'entry.ts': "require('./target.ts');",
				'target.ts': "console.log('CORRECT');",
				'target.ts.ts': "console.log('WRONG');",
			});
			expectCorrect(await node.cjsPatched(['./entry.ts'], fixture.path));
		});

		test('.tsx (ESM)', async () => {
			await using fixture = await createFixture({
				'entry.ts': "import './target.tsx';",
				'target.tsx': "console.log('CORRECT');",
				'target.tsx.ts': "console.log('WRONG');",
			});
			expectCorrect(await node.tsx(['./entry.ts'], fixture.path));
		});

		test('.tsx (CJS)', async () => {
			await using fixture = await createFixture({
				'entry.ts': "require('./target.tsx');",
				'target.tsx': "console.log('CORRECT');",
				'target.tsx.ts': "console.log('WRONG');",
			});
			expectCorrect(await node.cjsPatched(['./entry.ts'], fixture.path));
		});

		test('.mts (ESM)', async () => {
			await using fixture = await createFixture({
				'entry.ts': "import './target.mts';",
				'target.mts': "console.log('CORRECT');",
				'target.mts.ts': "console.log('WRONG');",
			});
			expectCorrect(await node.tsx(['./entry.ts'], fixture.path));
		});

		test('.cts (CJS)', async () => {
			await using fixture = await createFixture({
				'entry.ts': "require('./target.cts');",
				'target.cts': "console.log('CORRECT');",
				'target.cts.ts': "console.log('WRONG');",
			});
			expectCorrect(await node.cjsPatched(['./entry.ts'], fixture.path));
		});
	});

	// A `.js` specifier swaps to `.ts` (parent is TS), and the literal `.ts`
	// wins over any appended-guess file.
	test('.js → .ts swap resolves .ts, not .js.ts (ESM)', async () => {
		await using fixture = await createFixture({
			'entry.ts': "import './target.js';",
			'target.ts': "console.log('CORRECT');",
			'target.js.ts': "console.log('WRONG');",
		});
		expectCorrect(await node.tsx(['./entry.ts'], fixture.path));
	});

	// Extension-less specifiers must still resolve via implicit-extension
	// search — the verbatim skip must not disable this common TS pattern.
	test('extension-less resolves .ts (ESM)', async () => {
		await using fixture = await createFixture({
			'entry.ts': "import './target';",
			'target.ts': "console.log('CORRECT');",
		});
		expectCorrect(await node.tsx(['./entry.ts'], fixture.path));
	});

	test('extension-less resolves .ts (CJS)', async () => {
		await using fixture = await createFixture({
			'entry.ts': "require('./target');",
			'target.ts': "console.log('CORRECT');",
		});
		expectCorrect(await node.cjsPatched(['./entry.ts'], fixture.path));
	});
});
