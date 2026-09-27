import {
	describe, test, onFinish, onTestFail, expect,
} from 'manten';
import { createFixture } from 'fs-fixture';
import type { NodeApis } from '../utils/tsx.js';
import {
	expectErrors, jsxCheck, createPackageJson, createTsconfig,
} from '../fixtures.js';

export const tsconfig = ({ tsx }: NodeApis) => describe('tsconfig', () => {
	// 'commonjs' excluded: tsconfig behavior is identical for commonjs and undefined
	// (both resolve as CJS). Only 'module' changes resolution semantics.
	for (const packageType of [undefined, 'module'] as const) {
		describe(`package type: ${packageType ?? 'undefined'}`, async () => {
			const fixture = await createFixture({
				...expectErrors,

				'package.json': createPackageJson(packageType ? { type: packageType } : {}),

				'tsconfig.json': createTsconfig({
					compilerOptions: {
						jsxFactory: 'Array',
						jsxFragmentFactory: 'null',
						baseUrl: '.',
						paths: {
							'paths-exact-match': ['file'],
							'prefix/*': ['*'],
							'*/suffix': ['*'],
						},
					},
				}),

				'tsconfig-allowJs.json': createTsconfig({
					extends: './tsconfig.json',
					compilerOptions: {
						allowJs: true,
					},
				}),

				'tsconfig-broken.json': '{ asdf',

				'tsconfig-unresolvable.json': createTsconfig({
					extends: 'doesnt-exist',
				}),

				'index.tsx': `
				${jsxCheck};

				import './jsx';

				// Resolves relative to baseUrl
				import 'file';

				// Resolves paths - exact match
				import 'paths-exact-match';

				// Resolves paths - prefix match
				import 'prefix/file';

				// Resolves paths - suffix match
				import 'file/suffix';

				// tsconfig should not apply to dependency
				import 'tsconfig-should-not-apply';
				`,

				'file.ts': '',

				'jsx.jsx': `
				// tsconfig not applied to jsx because allowJs is not set
				import { expectErrors } from 'expect-errors';
				expectErrors(
					[() => ${jsxCheck}, 'React is not defined'],

					// These should throw unless allowJs is set
					// [() => import ('prefix/file'), "Cannot find package 'prefix'"],
					// [() => import ('paths-exact-match'), "Cannot find package 'paths-exact-match'"],
					// [() => import ('file'), "Cannot find package 'file'"],
				);
				`,

				'import-typescript-parent.js': `
				import './import-typescript-child.js';
				`,

				'import-typescript-child.ts': `
				console.log('imported');
				`,

				'node_modules/tsconfig-should-not-apply': {
					'package.json': createPackageJson({
						exports: {
							import: './index.mjs',
							default: './index.cjs',
						},
					}),
					'index.mjs': `
					import { expectErrors } from 'expect-errors';
					expectErrors(
						[() => import ('prefix/file'), "Cannot find package 'prefix'"],
						[() => import ('paths-exact-match'), "Cannot find package 'paths-exact-match'"],
						[() => import ('file'), "Cannot find package 'file'"],
					);
					`,
					'index.cjs': `
					const { expectErrors } = require('expect-errors');
					expectErrors(
						[() => require('prefix/file'), "Cannot find module"],
						[() => require('paths-exact-match'), "Cannot find module"],
						[() => require('file'), "Cannot find module"],
					);
					`,
				},
			});
			onFinish(async () => await fixture.rm());

			describe('detected tsconfig', () => {
				test('invalid tsconfig should be ignored', async () => {
					await using fixture = await createFixture({
						'package.json': createPackageJson(packageType ? { type: packageType } : {}),
						'tsconfig.json': createTsconfig({
							extends: 'doesnt-exist',
						}),
						'index.ts': '',
					});

					const pTsconfig = await tsx(['index.ts'], fixture.path);
					expect(pTsconfig.failed).toBe(false);
				});

				test('tsconfig', async () => {
					const pTsconfig = await tsx(['index.tsx'], fixture.path);
					onTestFail((error) => {
						console.error(error);
						console.log(pTsconfig);
					});
					expect(pTsconfig.failed).toBe(false);
					expect(pTsconfig.stderr).toBe('');
					expect(pTsconfig.stdout).toBe('');
				});

				const configDirectoryPlaceholder = `${'$'}{configDir}`;
				test(`paths can use ${configDirectoryPlaceholder} without baseUrl`, async () => {
					await using fixture = await createFixture({
						'package.json': createPackageJson(packageType ? { type: packageType } : {}),
						'tsconfig.json': createTsconfig({
							include: [
								'index.ts',
								'src/**/*.ts',
							],
							compilerOptions: {
								outDir: './dist',
								paths: {
									'@/*': [`${configDirectoryPlaceholder}/src/*`],
								},
							},
						}),
						'index.ts': `
						import { value } from '@/value';

						console.log(value);
						`,
						src: {
							'value.ts': `
							export const value: string = 'resolved via configDir';
							`,
						},
					});

					const pTsconfig = await tsx(['index.ts'], fixture.path);
					onTestFail((error) => {
						console.error(error);
						console.log(pTsconfig);
					});
					expect(pTsconfig.failed).toBe(false);
					expect(pTsconfig.stderr).toBe('');
					expect(pTsconfig.stdout).toBe('resolved via configDir');
				});

				test('tsconfig paths handle colon aliases and data URLs', async () => {
					await using fixture = await createFixture({
						'package.json': createPackageJson(packageType ? { type: packageType } : {}),
						'tsconfig.json': createTsconfig({
							compilerOptions: {
								baseUrl: '.',
								paths: {
									'data:*': ['./src/wrong.mjs'],
									'ns:*': ['./src/*'],
								},
							},
						}),
						'index.mts': `
						import { value as colonAlias } from 'ns:utils.mjs';
						import { value as dataUrl } from 'data:text/javascript,export%20const%20value%20%3D%20%22data-url%22%3B';

						console.log(JSON.stringify({
							colonAlias,
							dataUrl,
						}));
						`,
						src: {
							'utils.mts': "export const value = 'success';",
							'wrong.mts': "export const value = 'wrong';",
						},
					});

					const pTsconfig = await tsx(['index.mts'], fixture.path);
					onTestFail((error) => {
						console.error(error);
						console.log(pTsconfig);
					});
					expect(pTsconfig.failed).toBe(false);
					expect(pTsconfig.stderr).toBe('');
					expect(JSON.parse(pTsconfig.stdout)).toEqual({
						colonAlias: 'success',
						dataUrl: 'data-url',
					});
				});
			});

			describe('custom tsconfig', () => {
				test('invalid tsconfig should error', async () => {
					await using fixture = await createFixture({
						'package.json': createPackageJson(packageType ? { type: packageType } : {}),
						'tsconfig.json': createTsconfig({
							extends: 'doesnt-exist',
						}),
						'index.ts': '',
					});

					const pTsconfig = await tsx(['--tsconfig', 'tsconfig.json', 'index.ts'], fixture.path);
					expect(pTsconfig.failed).toBe(true);
				});

				test('custom tsconfig', async () => {
					const pTsconfigAllowJs = await tsx(['--tsconfig', 'tsconfig-allowJs.json', 'jsx.jsx'], fixture.path);
					onTestFail((error) => {
						console.error(error);
						console.log(pTsconfigAllowJs);
					});
					expect(pTsconfigAllowJs.failed).toBe(true);
					expect(pTsconfigAllowJs.stderr).toMatch('Error: No error thrown');
					expect(pTsconfigAllowJs.stdout).toBe('');
				});

				test('allowJs in tsconfig.json', async () => {
					const pTsconfigAllowJs = await tsx(['--tsconfig', 'tsconfig-allowJs.json', 'import-typescript-parent.js'], fixture.path);
					onTestFail((error) => {
						console.error(error);
						console.log(pTsconfigAllowJs);
					});
					expect(pTsconfigAllowJs.failed).toBe(false);
					expect(pTsconfigAllowJs.stderr).toBe('');
					expect(pTsconfigAllowJs.stdout).toBe('imported');
				});
			});
		});
	}

	describe('allowJs dependency resolution', () => {
		// https://github.com/privatenumber/tsx/issues/640
		test('does not rewrite a missing bare CommonJS dependency', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'tsconfig.json': createTsconfig({
					compilerOptions: { allowJs: true },
				}),
				'entry.cts': 'require("dependency");',
				node_modules: {
					dependency: {
						'package.json': createPackageJson({
							name: 'dependency',
							main: './index.js',
						}),
						'index.js': 'module.exports = require("target");',
					},
					'target.js': {
						'package.json': createPackageJson({
							name: 'target.js',
							main: './index.js',
						}),
						'index.js': 'console.log("resolved target.js");',
					},
				},
			});

			const process = await tsx(['entry.cts'], fixture.path);

			expect(process.exitCode).toBe(1);
			expect(process.stderr).toMatch("Cannot find module 'target'");
		});

		test('does not rewrite a suffixed bare CommonJS dependency', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'tsconfig.json': createTsconfig({
					compilerOptions: { allowJs: true },
				}),
				'entry.cts': 'require("dependency");',
				node_modules: {
					dependency: {
						'package.json': createPackageJson({
							name: 'dependency',
							main: './index.js',
						}),
						'index.js': 'module.exports = require("target.js");',
					},
					'target.ts': {
						'package.json': createPackageJson({
							name: 'target.ts',
							main: './index.js',
						}),
						'index.js': 'console.log("resolved target.ts");',
					},
				},
			});

			const process = await tsx(['entry.cts'], fixture.path);

			expect(process.exitCode).toBe(1);
			expect(process.stderr).toMatch("Cannot find module 'target.js'");
		});

		test('preserves a CommonJS dependency JSON asset', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'tsconfig.json': createTsconfig({
					compilerOptions: { allowJs: true },
				}),
				'entry.cts': 'console.log(require("dependency").value);',
				node_modules: {
					dependency: {
						'package.json': createPackageJson({
							name: 'dependency',
							main: './index.js',
						}),
						'index.js': 'module.exports = require("./metadata.min.json");',
						'metadata.min.json': JSON.stringify({ value: 'from-json' }),
						'metadata.min.json.js': 'module.exports = { value: "from-json-wrapper" };',
					},
				},
			});

			const process = await tsx(['entry.cts'], fixture.path);

			expect(process.exitCode).toBe(0);
			expect(process.stderr).toBe('');
			expect(process.stdout).toBe('from-json');
		});

		test('preserves local explicit JSON assets with allowJs', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'tsconfig.json': createTsconfig({
					compilerOptions: { allowJs: true },
				}),
				'entry.js': 'console.log(require("./metadata.min.json").value);',
				'metadata.min.json': JSON.stringify({ value: 'from-json' }),
				'metadata.min.json.js': 'module.exports = { value: "from-json-wrapper" };',
			});

			const process = await tsx(['entry.js'], fixture.path);

			expect(process.exitCode).toBe(0);
			expect(process.stderr).toBe('');
			expect(process.stdout).toBe('from-json');
		});

		test('does not append an extension to a missing local bare package', async () => {
			await using fixture = await createFixture({
				'package.json': createPackageJson({ type: 'commonjs' }),
				'tsconfig.json': createTsconfig({
					compilerOptions: { allowJs: true },
				}),
				'entry.js': 'require("target");',
				node_modules: {
					'target.js': {
						'package.json': createPackageJson({
							name: 'target.js',
							main: './index.js',
						}),
						'index.js': 'console.log("resolved target.js");',
					},
				},
			});

			const process = await tsx(['entry.js'], fixture.path);

			expect(process.exitCode).toBe(1);
			expect(process.stderr).toMatch("Cannot find module 'target'");
		});
	});

	// Each file uses the tsconfig that owns it, like the TypeScript language server
	// https://github.com/privatenumber/tsx/issues/696
	describe('per-file tsconfig', () => {
		for (const packageType of [undefined, 'module'] as const) {
			describe(`package type: ${packageType ?? 'undefined'}`, () => {
				const createWorkspace = () => createFixture({
					packages: {
						app: {
							'package.json': createPackageJson(packageType ? { type: packageType } : {}),
							'tsconfig.json': createTsconfig({
								compilerOptions: {
									jsxFactory: 'Array',
									jsxFragmentFactory: 'null',
									paths: {
										'~/*': ['./lib/*'],
									},
								},
							}),
							'own-jsx.tsx': 'console.log(JSON.stringify(<div>JSX</div>));',
							'dep-jsx.ts': `
							import { value } from 'dep';
							console.log(value);
							`,
							'dep-alias.ts': `
							import { label } from 'dep/alias';
							console.log(label);
							`,

							// Same alias as the dependency, pointing to a different file
							'lib/label.ts': 'export const label = "app label";',
							'node_modules/dep': ({ symlink }) => symlink('../../dep'),
						},
						dep: {
							'package.json': createPackageJson({
								name: 'dep',
								...(packageType ? { type: packageType } : {}),
								exports: {
									'.': './index.tsx',
									'./alias': './alias.ts',
								},
							}),
							'tsconfig.json': createTsconfig({
								compilerOptions: {
									jsxFactory: 'depJsx',
									jsxFragmentFactory: 'null',
									paths: {
										'~/*': ['./lib/*'],
									},
								},
							}),
							'index.tsx': `
							const depJsx = (tag: string, _props: unknown, ...children: unknown[]) => ({ tag, children });
							export const value = JSON.stringify(<div>JSX</div>);
							`,
							'alias.ts': "export { label } from '~/label';",
							'lib/label.ts': 'export const label = "dep label";',
						},
					},
				});

				test('dependency compiles with its own tsconfig', async () => {
					await using fixture = await createWorkspace();

					const process = await tsx(['dep-jsx.ts'], fixture.getPath('packages/app'));
					onTestFail(() => {
						console.log(process);
					});

					expect(process.stderr).toBe('');
					expect(process.stdout).toBe('{"tag":"div","children":["JSX"]}');
				});

				test('entry tsconfig applies when run from a directory without tsconfig', async () => {
					await using fixture = await createWorkspace();

					const process = await tsx(['packages/app/own-jsx.tsx'], fixture.path);
					onTestFail(() => {
						console.log(process);
					});

					expect(process.stderr).toBe('');
					expect(process.stdout).toBe('["div",null,"JSX"]');
				});

				test('dependency path alias resolves with its own tsconfig', async () => {
					await using fixture = await createWorkspace();

					const process = await tsx(['dep-alias.ts'], fixture.getPath('packages/app'));
					onTestFail(() => {
						console.log(process);
					});

					expect(process.stderr).toBe('');
					expect(process.stdout).toBe('dep label');
				});
			});
		}
	});

	// Like TypeScript, package imports targeting outDir resolve to the rootDir source
	// https://github.com/privatenumber/tsx/issues/714
	describe('package imports from outDir', () => {
		for (const packageType of [undefined, 'module'] as const) {
			describe(`package type: ${packageType ?? 'undefined'}`, () => {
				const createProject = (files?: Record<string, string>) => createFixture({
					'package.json': createPackageJson({
						...(packageType ? { type: packageType } : {}),
						imports: {
							'#~/*': './dist/*',
						},
					}),
					'tsconfig.json': createTsconfig({
						compilerOptions: {
							rootDir: './src',
							outDir: './dist',
						},
					}),
					'src/main.ts': `
					import { value } from '#~/example/example.js';
					console.log(value);
					`,
					'src/example/example.ts': 'export const value = "from source";',
					...files,
				});

				test('resolves to rootDir source', async () => {
					await using fixture = await createProject();

					const process = await tsx(['src/main.ts'], fixture.path);
					onTestFail(() => {
						console.log(process);
					});

					expect(process.stderr).toBe('');
					expect(process.stdout).toBe('from source');
				});

				test('prefers rootDir source over compiled outDir file', async () => {
					await using fixture = await createProject({
						'dist/example/example.js': (
							packageType === 'module'
								? 'export const value = "from stale build";'
								: 'exports.value = "from stale build";'
						),
					});

					const process = await tsx(['src/main.ts'], fixture.path);
					onTestFail(() => {
						console.log(process);
					});

					expect(process.stderr).toBe('');
					expect(process.stdout).toBe('from source');
				});

				const builtValue = (value: string) => (
					packageType === 'module'
						? `export const value = "${value}";`
						: `exports.value = "${value}";`
				);

				test('ignores tsconfig outside the package', async () => {
					await using fixture = await createFixture({
						// outDir contains the package, but the tsconfig isn't part of it
						'tsconfig.json': createTsconfig({
							compilerOptions: {
								outDir: './lib',
							},
						}),
						'lib/pkg': {
							'package.json': createPackageJson({
								...(packageType ? { type: packageType } : {}),
								imports: {
									'#x': './x.js',
								},
							}),
							'x.js': builtValue('from package'),
							'main.ts': `
							import { value } from '#x';
							console.log(value);
							`,
						},
						'pkg/x.ts': 'export const value = "from unrelated source";',
					});

					const process = await tsx(['lib/pkg/main.ts'], fixture.path);
					onTestFail(() => {
						console.log(process);
					});

					expect(process.stderr).toBe('');
					expect(process.stdout).toBe('from package');
				});

				test('ignores dependency package imports', async () => {
					await using fixture = await createFixture({
						'package.json': createPackageJson(packageType ? { type: packageType } : {}),
						// outDir covers node_modules
						'tsconfig.json': createTsconfig({
							compilerOptions: {
								rootDir: './src',
								outDir: '.',
							},
						}),
						'main.ts': `
						import { value } from 'dep';
						console.log(value);
						`,
						'node_modules/dep': {
							'package.json': createPackageJson({
								name: 'dep',
								...(packageType ? { type: packageType } : {}),
								exports: './index.js',
								imports: {
									'#x': './x.js',
								},
							}),
							'index.js': (
								packageType === 'module'
									? "export { value } from '#x';"
									: "module.exports = require('#x');"
							),
							'x.js': builtValue('from dependency'),
						},
						'src/node_modules/dep/x.ts': 'export const value = "from unrelated source";',
					});

					const process = await tsx(['--tsconfig', 'tsconfig.json', 'main.ts'], fixture.path);
					onTestFail(() => {
						console.log(process);
					});

					expect(process.stderr).toBe('');
					expect(process.stdout).toBe('from dependency');
				});
			});
		}
	});
});
