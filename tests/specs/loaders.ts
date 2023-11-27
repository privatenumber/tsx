import { testSuite, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';

export default testSuite(({ describe }, node: NodeApis) => {
	describe('Loaders', ({ describe }) => {
		describe('Hooks', async ({ test }) => {
			const fixture = await createFixture({
				'package.json': JSON.stringify({ type: 'module' }),

				'ts.ts': `
				import fs from 'fs';

				console.log(Boolean(fs) as unknown as string);
				`,
				'mts.mts': `
				import fs from 'fs';

				console.log(JSON.stringify([Boolean(fs) as unknown as string, import.meta.url]));
				`,
			});

			test('.ts', async () => {
				const tsxResult = await node.hook(['./ts.ts'], fixture.path);

				expect(tsxResult.stdout).toBe('true');
				if (node.supports.moduleRegister) {
					expect(tsxResult.stderr).toBe('');
				} else {
					expect(tsxResult.stderr).toMatch('ExperimentalWarning: Custom ESM Loaders is an experimental feature');
				}
				expect(tsxResult.exitCode).toBe(0);
			});

			test('.mts', async () => {
				const tsxResult = await node.hook(['./mts.mts'], fixture.path);

				const [imported, importMetaUrl] = JSON.parse(tsxResult.stdout);
				expect(imported).toBe(true);
				expect(importMetaUrl.endsWith('/mts.mts')).toBeTruthy();

				if (node.supports.moduleRegister) {
					expect(tsxResult.stderr).toBe('');
				} else {
					expect(tsxResult.stderr).toMatch('ExperimentalWarning: Custom ESM Loaders is an experimental feature');
				}
				expect(tsxResult.exitCode).toBe(0);
			});
		});

		describe('CJS patching', async ({ test }) => {
			const fixture = await createFixture({
				'package.json': JSON.stringify({ type: 'commonjs' }),

				'ts.ts': `
				import fs from 'fs';

				console.log(Boolean(fs) as unknown as string);
				`,
				'cts.cts': `
				import fs from 'fs';

				console.log(Boolean(fs) as unknown as string);
				`,
				'mts.mts': `
				import fs from 'fs';

				console.log(Boolean(fs) as unknown as string, import.meta.url);
				`,
			});

			test('.ts', async () => {
				const tsxResult = await node.cjsPatched(['./ts.ts'], fixture.path);

				expect(tsxResult.stdout).toBe('true');
				expect(tsxResult.stderr).toBe('');
				expect(tsxResult.exitCode).toBe(0);
			});

			// TODO: Investigate why this works -- it shouldnt
			// test('should not be able to load .mjs', async () => {
			// 	const tsxResult = await node.cjsPatched(['./mts.mts'], fixture.path);

			// 	expect(tsxResult.stdout).toBe('true');
			// 	expect(tsxResult.stderr).toBe('');
			// 	expect(tsxResult.exitCode).toBe(0);
			// });
		});
	});
});
