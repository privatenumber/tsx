import { fileURLToPath } from 'node:url';
import { execaNode } from 'execa';
import { describe, test } from 'manten';
import { createFixture } from 'fs-fixture';
import { createTsconfig } from '../fixtures.js';

/**
 * Verifies consumer projects can emit declarations from tsx's public API.
 *
 * The public signatures must be expressible with types reachable from the
 * package entry points. If they reference types private to generated
 * declaration chunks, consumers re-exporting API values fail declaration
 * emission with TS2742.
 */
export const apiDeclarations = () => describe('API declaration emit', () => {
	test('consumer re-exporting register() emits declarations', async () => {
		await using fixture = await createFixture({
			'package.json': JSON.stringify({
				name: 'tsx-api-consumer',
				private: true,
				type: 'module',
			}),
			'tsconfig.json': createTsconfig({
				compilerOptions: {
					module: 'NodeNext',
					moduleResolution: 'NodeNext',
					strict: true,
					declaration: true,
					emitDeclarationOnly: true,
					skipLibCheck: false,
					outDir: 'dist-dts',
				},
			}),
			'index.mts': `
			import { register, tsImport } from 'tsx/esm/api';

			export const createRegistration = () => register({ namespace: 'example' });
			export const registration = register;
			export const importer = tsImport;
			`,
			'index.cts': `
			import { register } from 'tsx/cjs/api';

			export const createRegistration = () => register({ namespace: 'example' });
			export const registration = register;
			`,
			node_modules: {
				// Link to the repository so the consumer resolves the built package
				tsx: ({ symlink }) => symlink(fileURLToPath(new URL('../..', import.meta.url))),
				'@types/node': ({ symlink }) => symlink(fileURLToPath(new URL('../../node_modules/@types/node', import.meta.url))),
			},
		});

		const tscPath = fileURLToPath(new URL('../../node_modules/typescript/lib/tsc.js', import.meta.url));
		// Fails the test with compiler output on a nonzero exit code
		await execaNode(tscPath, ['-p', fixture.path]);
	});
});
