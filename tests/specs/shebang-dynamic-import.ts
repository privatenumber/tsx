import {
	describe, test, onFinish, expect,
} from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';
import { createPackageJson } from '../fixtures.js';

/**
 * Test coverage for Issue #842, wherein a script that uses both a shebang and a dynamic import caused a parse error.
 */
export const shebangDynamicImport = (node: NodeApis) => describe('shebang + dynamic import', async () => {
	// A shebang whose text tokenizes as invalid JS (the `import` keyword),
	// combined with a dynamic import that forces the dynamic-import transform.
	const shebang = '#!/usr/bin/env -S node --import tsx';

	const fixture = await createFixture({
		'package.json': createPackageJson({ type: 'module' }),

		// Bug trigger: shebang + dynamic import().
		'dynamic-import.js': `${shebang}\nawait import('node:os');\nconsole.log('RAN_OK');\n`,

		// Control: same shebang, but a static import instead of a dynamic one.
		// This does not invoke the dynamic-import transform, so it must run fine.
		'static-import.js': `${shebang}\nimport os from 'node:os';\nvoid os;\nconsole.log('RAN_OK');\n`,
	});
	onFinish(async () => await fixture.rm());

	test('runs a file with a non-JS shebang and a dynamic import', async () => {
		const tsxResult = await node.tsx([fixture.getPath('dynamic-import.js')]);

		const output = `${tsxResult.stdout}\n${tsxResult.stderr}`;
		expect(output).not.toMatch('Parse error');
		expect(tsxResult.stdout).toMatch('RAN_OK');
		expect(tsxResult.exitCode).toBe(0);
	});

	// Control/sanity: proves the failure above is specific to the dynamic-import
	// path and not a broken harness or a generally-unparseable shebang.
	test('control: same shebang with a static import runs fine', async () => {
		const tsxResult = await node.tsx([fixture.getPath('static-import.js')]);

		const output = `${tsxResult.stdout}\n${tsxResult.stderr}`;
		expect(output).not.toMatch('Parse error');
		expect(tsxResult.stdout).toMatch('RAN_OK');
		expect(tsxResult.exitCode).toBe(0);
	});
});
