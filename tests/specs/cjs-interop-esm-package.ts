import {
	describe, test, onTestFail, expect,
} from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';
import {
	createPackageJson,
	createTsconfig,
} from '../fixtures.js';

// https://github.com/privatenumber/tsx/issues/614
// https://github.com/ufr-scf/tsx-missing-export
export const cjsInteropEsmPackage = (node: NodeApis) => describe('CJS interop from ESM package', () => {
	test('named imports via tsconfig paths from type module package', async () => {
		await using fixture = await createFixture({
			backend: {
				'package.json': createPackageJson({ type: 'module' }),
				'tsconfig.json': createTsconfig({
					include: ['src/**/*.ts'],
					compilerOptions: {
						rootDir: './src',
						paths: {
							'@/shared': ['../shared/src/index.ts'],
							'@/shared/*': ['../shared/src/*'],
						},
					},
				}),
				src: {
					'index.ts': `
						import { magicNumber, Permission } from '@/shared';

						const permission: Permission = Permission.Read;

						console.log('Hello World', magicNumber);
					`,
				},
			},
			shared: {
				src: {
					'index.ts': 'export * from "./permission";',
					'permission.ts': `
						export enum Permission {
							Read = 'Read',
							Write = 'Write',
						}

						export const magicNumber = 42;
					`,
				},
			},
		});

		const result = await node.tsx(['src/index.ts'], fixture.getPath('backend'));
		onTestFail(() => {
			console.log(result);
		});

		expect({
			failed: result.failed,
			exitCode: result.exitCode,
			stdout: result.stdout,
			stderr: result.stderr,
		}).toEqual({
			failed: false,
			exitCode: 0,
			stdout: 'Hello World 42',
			stderr: '',
		});
	});
});
