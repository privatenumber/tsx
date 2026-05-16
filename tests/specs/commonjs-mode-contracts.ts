import {
	describe, test, onTestFail, expect,
} from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';
import {
	createPackageJson,
	createTsconfig,
} from '../fixtures.js';

const commonJsModes = [
	{
		label: 'omitted type',
		packageJson: {},
	},
	{
		label: 'explicit commonjs',
		packageJson: { type: 'commonjs' as const },
	},
] as const;

export const commonJsModeContracts = (node: NodeApis) => describe('CommonJS mode contracts', () => {
	test('omitted type and explicit commonjs share the same package main/exports resolution behavior', async () => {
		for (const { label, packageJson } of commonJsModes) {
			await using fixture = await createFixture({
				'package.json': createPackageJson(packageJson),
				'index.js': `
					import exportsValue from 'pkg-exports';
					import mainValue from 'pkg-main';

					console.log(JSON.stringify({
						exportsValue,
						mainValue,
					}));
					`,
				node_modules: {
					'pkg-exports': {
						'package.json': createPackageJson({
							name: 'pkg-exports',
							exports: './test.ts',
						}),
						'test.ts': 'export default "exports";',
					},
					'pkg-main': {
						'package.json': createPackageJson({
							name: 'pkg-main',
							main: './test.ts',
						}),
						'test.ts': 'export default "main";',
					},
				},
			});

			const result = await node.tsx(['index.js'], fixture.path);
			onTestFail(() => {
				console.log(label, result);
			});

			expect({
				failed: result.failed,
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
			}).toEqual({
				failed: false,
				exitCode: 0,
				stdout: '{"exportsValue":"exports","mainValue":"main"}',
				stderr: '',
			});
		}
	});

	test('omitted type and explicit commonjs share the same detected tsconfig behavior', async () => {
		for (const { label, packageJson } of commonJsModes) {
			await using fixture = await createFixture({
				'package.json': createPackageJson(packageJson),
				'tsconfig.json': createTsconfig({
					compilerOptions: {
						baseUrl: '.',
						paths: {
							alias: ['./file.ts'],
						},
					},
				}),
				'index.ts': `
					import { value } from 'alias';

					console.log(value);
					`,
				'file.ts': 'export const value = "resolved";',
			});

			const result = await node.tsx(['index.ts'], fixture.path);
			onTestFail(() => {
				console.log(label, result);
			});

			expect({
				failed: result.failed,
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
			}).toEqual({
				failed: false,
				exitCode: 0,
				stdout: 'resolved',
				stderr: '',
			});
		}
	});

	test('omitted type and explicit commonjs share the same explicit allowJs behavior', async () => {
		for (const { label, packageJson } of commonJsModes) {
			await using fixture = await createFixture({
				'package.json': createPackageJson(packageJson),
				'tsconfig-allowJs.json': createTsconfig({
					compilerOptions: {
						allowJs: true,
					},
				}),
				'import-typescript-parent.js': `
					import './import-typescript-child.js';
					`,
				'import-typescript-child.ts': `
					console.log('imported');
					`,
			});

			const result = await node.tsx(
				['--tsconfig', 'tsconfig-allowJs.json', 'import-typescript-parent.js'],
				fixture.path,
			);
			onTestFail(() => {
				console.log(label, result);
			});

			expect({
				failed: result.failed,
				exitCode: result.exitCode,
				stdout: result.stdout,
				stderr: result.stderr,
			}).toEqual({
				failed: false,
				exitCode: 0,
				stdout: 'imported',
				stderr: '',
			});
		}
	});
});
