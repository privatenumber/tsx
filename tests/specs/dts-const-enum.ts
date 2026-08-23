import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import outdent from 'outdent';
import type { NodeApis } from '../utils/tsx.js';
import { createPackageJson } from '../fixtures.js';

/**
 * https://github.com/privatenumber/tsx/issues/321
 *
 * A `const enum` declared in an adjacent `.d.ts` never reached runtime:
 * `SyntaxError` for a named import, `undefined` for a namespace import.
 */
export const dtsConstEnum = (
	node: NodeApis,
) => describe('adjacent .d.ts const enum', () => {
	test('named import', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.js': outdent`
			export default function usesEnum(value) {
				return \`got:\${value}\`;
			}
			`,
			'some-lib/index.d.ts': outdent`
			export const enum TestEnum {
				Foo = 'foo',
				Bar = 'bar',
			}
			declare function usesEnum(value: TestEnum): string;
			export default usesEnum;
			`,
			'entry.ts': outdent`
			import usesEnum, { TestEnum } from './some-lib/index.js';
			console.log(usesEnum(TestEnum.Foo));
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('got:foo');
	});

	// Unlike tsc, the enum is a real binding here, so it appears on the namespace
	test('namespace import', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.js': 'export default function usesEnum() {}',
			'some-lib/index.d.ts': outdent`
			export const enum TestEnum {
				Foo = 'foo',
				Bar = 'bar',
			}
			declare function usesEnum(): void;
			export default usesEnum;
			`,
			'entry.ts': outdent`
			import * as someLib from './some-lib/index.js';
			console.log(someLib.TestEnum.Foo, someLib.TestEnum.Bar);
			console.log(JSON.stringify(Object.keys(someLib)));
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('foo bar\n["TestEnum","default"]');
	});

	// The form tsc emits. esbuild erases ambient declarations, so this emits
	// nothing unless `declare` is dropped
	test('declare modifier', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.js': 'export const value = 1;',
			'some-lib/index.d.ts': outdent`
			export declare const enum Declared {
				Foo = 'declared-foo'
			}
			export declare const value: number;
			`,
			'entry.ts': outdent`
			import { Declared, value } from './some-lib/index.js';
			console.log(Declared.Foo, value);
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('declared-foo 1');
	});

	test('numeric members auto-increment', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.js': 'export const value = 1;',
			'some-lib/index.d.ts': outdent`
			export declare const enum Numbers {
				a = 0,
				b = 1,
				c = 10,
				d = 11
			}
			`,
			'entry.ts': outdent`
			import { Numbers } from './some-lib/index.js';
			console.log(Numbers.a, Numbers.b, Numbers.c, Numbers.d, Numbers[10]);
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('0 1 10 11 c');
	});

	test('.mjs reads .d.mts', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.mjs': 'export const value = 1;',
			'some-lib/index.d.mts': outdent`
			export declare const enum Mts {
				Foo = 'mts-foo'
			}
			`,
			'entry.ts': outdent`
			import { Mts } from './some-lib/index.mjs';
			console.log(Mts.Foo);
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('mts-foo');
	});

	// A truncated body loses every enum in the file, not just this one
	test('member value containing a brace', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.js': 'export const value = 1;',
			'some-lib/index.d.ts': outdent`
			export declare const enum Braced {
				Close = '}',
				Open = '{'
			}
			export declare const enum AlsoHere {
				Foo = 'also'
			}
			`,
			'entry.ts': outdent`
			import { Braced, AlsoHere } from './some-lib/index.js';
			console.log(Braced.Close, Braced.Open, AlsoHere.Foo);
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('} { also');
	});

	// Injecting the declared name directly would redeclare the module's own
	// local, which is a SyntaxError
	test('does not collide with a same-named local binding', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.js': outdent`
			const TestEnum = { Foo: 'local' };
			export const value = TestEnum.Foo;
			`,
			'some-lib/index.d.ts': outdent`
			export declare const enum TestEnum {
				Foo = 'from-dts'
			}
			export declare const value: string;
			`,
			'entry.ts': outdent`
			import { value, TestEnum } from './some-lib/index.js';
			console.log(value, TestEnum.Foo);
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('local from-dts');
	});

	test('member documented with a braced JSDoc comment', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.js': 'export const value = 1;',
			'some-lib/index.d.ts': outdent`
			export declare const enum Documented {
				/** See {@link value} for details */
				Foo = 'documented-foo'
			}
			`,
			'entry.ts': outdent`
			import { Documented } from './some-lib/index.js';
			console.log(Documented.Foo);
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('documented-foo');
	});

	// Appending a second binding of the same name would be a duplicate export
	test('does not shadow a real export of the same name', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.js': "export const TestEnum = { Foo: 'runtime' };",
			'some-lib/index.d.ts': outdent`
			export declare const enum TestEnum {
				Foo = 'from-dts'
			}
			`,
			'entry.ts': outdent`
			import { TestEnum } from './some-lib/index.js';
			console.log(TestEnum.Foo);
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('runtime');
	});

	test('leaves a .js file without an adjacent .d.ts untouched', async () => {
		await using fixture = await createFixture({
			'package.json': createPackageJson({ type: 'module' }),
			'some-lib/index.js': "export const value = 'plain';",
			'entry.ts': outdent`
			import * as someLib from './some-lib/index.js';
			console.log(JSON.stringify(Object.keys(someLib)));
			`,
		});

		const { stdout, exitCode } = await node.tsx(['./entry.ts'], fixture.path);
		expect(exitCode).toBe(0);
		expect(stdout).toBe('["value"]');
	});
});
