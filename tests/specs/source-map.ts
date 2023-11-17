import { testSuite, expect } from 'manten';
import { stripSourceMap } from '../../src/source-map';

export default testSuite(({ describe }) => {
	describe('Source Map', ({ describe }) => {
		describe('stripSourceMap', ({ test }) => {
			test('end of file, no trailing newline', () => {
				const file = 'const foo = 1;\n//# sourceMappingURL=foo.js.map';
				expect(stripSourceMap(file)).toBe('const foo = 1;');
			});

			test('end of file, with trailing newlines', () => {
				const file = 'const foo = 1;\n//# sourceMappingURL=foo.js.map\n';
				expect(stripSourceMap(file)).toBe('const foo = 1;\n');
			});

			test('middle of file', () => {
				const file = 'const foo = 1;\n//# sourceMappingURL=foo.js.map\nconst bar = 2;';
				expect(stripSourceMap(file)).toBe('const foo = 1;\nconst bar = 2;');
			});
		});
	});
});