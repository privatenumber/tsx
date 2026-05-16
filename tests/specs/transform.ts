import { describe, test, expect } from 'manten';
import { createFsRequire } from 'fs-require';
import { createFixture } from 'fs-fixture';
import { execaNode } from 'execa';
import { Volume } from 'memfs';
import outdent from 'outdent';
import { transform, transformSync } from '../../src/utils/transform/index.js';
import { inlineSourceMap } from '../../src/source-map.js';

const base64Module = (code: string) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;

const fixtures = {
	ts: outdent`
	const __filename = 'filename';
	const __dirname = 'dirname';
	try {
		const unusedVariable1 = 1;
	} catch (unusedError) {
		const unusedVariable2 = 2;
	}
	export default 'default value' as string;
	export const named: string = 'named';
	export const functionName: string = (function named() {}).name;
	export const url = import.meta.url;
	`,

	esm: outdent`
	const __filename = 'filename';
	const __dirname = 'dirname';
	try {
		const unusedVariable1 = 1;
	} catch (unusedError) {
		const unusedVariable2 = 2;
	}

	export default 'default value';
	export const named = 'named';
	export const functionName = (function named() {}).name;
	export const url = import.meta.url;
	`,
};

export const transformSpec = () => describe('transform', () => {
	describe('sync', () => {
		test('transforms ESM to CJS', () => {
			const transformed = transformSync(
				fixtures.esm,
				'file.js',
				{ format: 'cjs' },
			);

			// For debuggers
			expect(transformed.code).toMatch('unusedVariable1');
			expect(transformed.code).toMatch('unusedVariable2');

			const fsRequire = createFsRequire(Volume.fromJSON({
				'/file.js': transformed.code,
			}));

			expect(fsRequire('/file.js')).toStrictEqual({
				default: 'default value',
				functionName: 'named',
				named: 'named',
				url: expect.stringMatching(/^file:\/\/\/.*\/file.js$/),
			});
		});

		test('import.meta helper cannot be shadowed by user bindings', () => {
			const transformed = transformSync(
				`
				const define_import_meta_default = { url: 'shadowed' };
				export const url = import.meta.url;
				export const local = define_import_meta_default.url;
				`,
				'file.js',
				{ format: 'cjs' },
			);

			const fsRequire = createFsRequire(Volume.fromJSON({
				'/file.js': transformed.code,
			}));

			expect(fsRequire('/file.js')).toEqual({
				local: 'shadowed',
				url: expect.stringMatching(/^file:\/\/\/.*\/file.js$/),
			});
		});

		test('doesnt emit import.meta helper without import.meta syntax', () => {
			const transformed = transformSync(
				`
				// import.meta.url
				const text = 'import.meta.url';
				export const value = text;
				`,
				'file.js',
				{ format: 'cjs' },
			);

			expect(transformed.code).not.toContain('import_meta');
		});

		test('supports import.meta object access', () => {
			const transformed = transformSync(
				`
				export const meta = import.meta;
				export const computed = import.meta['url'];
				export const destructured = (() => {
					const { url } = import.meta;
					return url;
				})();
				export const prototype = Object.getPrototypeOf(import.meta);
				export const hasProto = '__proto__' in import.meta;
				export const urlDescriptor = Object.getOwnPropertyDescriptor(import.meta, 'url');
				`,
				'file.js',
				{ format: 'cjs' },
			);
			const loaded = createFsRequire(Volume.fromJSON({
				'/file.js': transformed.code,
			}))('/file.js');

			expect(loaded.meta.url).toMatch(/^file:\/\/\/.*\/file.js$/);
			expect(loaded.computed).toMatch(/^file:\/\/\/.*\/file.js$/);
			expect(loaded.destructured).toMatch(/^file:\/\/\/.*\/file.js$/);
			expect(loaded.urlDescriptor).toStrictEqual({
				configurable: true,
				enumerable: true,
				value: expect.stringMatching(/^file:\/\/\/.*\/file.js$/),
				writable: true,
			});

			// TODO: Match native Node import.meta shape without adding another
			// source-map transform pass.
			// expect(Object.getPrototypeOf(loaded.meta)).toBe(null);
			// expect(loaded.prototype).toBe(null);
			// expect(loaded.hasProto).toBe(false);
		});

		test('import.meta helper preserves source map columns', async () => {
			await using fixture = await createFixture({});
			const fileName = fixture.getPath('source-map-check.ts');
			const transformed = transformSync(
				outdent`
				export const meta = import.meta;
				const value = 'x';
				throw new Error('source-map-check');
				`,
				fileName,
				{ format: 'cjs' },
			);
			await fixture.writeFile('source-map-check.cjs', inlineSourceMap(transformed));

			const { exitCode, stderr } = await execaNode(
				fixture.getPath('source-map-check.cjs'),
				{
					nodeOptions: ['--enable-source-maps'],
					reject: false,
				},
			);
			expect(exitCode).toBe(1);
			expect(stderr).toContain(`${fileName}:3:7`);
		});

		test('dynamic import', () => {
			const dynamicImport = transformSync(
				'import((0, _url.pathToFileURL)(path).href)',
				'file.js',
				{ format: 'cjs' },
			);

			expect(dynamicImport.code).toMatch('.href).then');
		});

		test('sourcemap file', () => {
			const fileName = 'file.mts';
			const transformed = transformSync(
				fixtures.ts,
				fileName,
				{ format: 'esm' },
			);

			expect(transformed.map).not.toBe('');

			const { map } = transformed;
			if (typeof map !== 'string') {
				expect(map.sources.length).toBe(1);
				expect(map.sources[0]).toBe(fileName);
				expect(map.names).toStrictEqual(['named']);
			}
		});

		test('quotes in file path', () => {
			const fileName = '\'"name.mts';
			const transformed = transformSync(
				fixtures.ts,
				fileName,
				{ format: 'esm' },
			);

			expect(transformed.map).not.toBe('');

			const { map } = transformed;
			if (typeof map !== 'string') {
				expect(map.sources.length).toBe(1);
				expect(map.sources[0]).toBe(fileName);
				expect(map.names).toStrictEqual(['named']);
			}
		});
	});

	describe('async', () => {
		test('transforms TS to ESM', async () => {
			const transformed = await transform(
				fixtures.ts,
				'file.ts',
				{ format: 'esm' },
			);

			// For debuggers
			expect(transformed.code).toMatch('unusedVariable1');
			expect(transformed.code).toMatch('unusedVariable2');

			const imported = await import(base64Module(transformed.code));
			expect({ ...imported }).toStrictEqual({
				default: 'default value',
				functionName: 'named',
				named: 'named',
				url: expect.stringMatching(/^data:text\/javascript;base64,.+$/),
			});
		});

		test('sourcemap file', async () => {
			const fileName = 'file.cts';
			const transformed = await transform(
				fixtures.ts,
				fileName,
				{ format: 'esm' },
			);

			expect(transformed.map).not.toBe('');

			const { map } = transformed;
			if (typeof map !== 'string') {
				expect(map.sources.length).toBe(1);
				expect(map.sources[0]).toBe(fileName);
				expect(map.names).toStrictEqual(['named']);
			}
		});
	});
});
