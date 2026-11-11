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
export const cjsInteropEsmPackage = (node: NodeApis) => describe('CJS interop from ESM package', () => {
	test('named imports via tsconfig paths from type module package', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'tsconfig.json': createTsconfig({
				compilerOptions: {
					baseUrl: '.',
					paths: {
						'@shared': ['./lib/shared/index.ts'],
						'@shared/*': ['./lib/shared/*'],
					},
				},
			}),
			'index.ts': `
				import { magicNumber, Permission } from '@shared';

				const permission: Permission = Permission.Read;

				console.log(magicNumber, permission);
			`,
			lib: {
				shared: {
					'index.ts': 'export * from "./permission.ts";',
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

		const result = await node.tsx(['index.ts'], fixture.path);
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
			stdout: '42 Read',
			stderr: '',
		});
	});
});
