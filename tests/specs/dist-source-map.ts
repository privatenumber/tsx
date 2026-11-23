import fs from 'node:fs/promises';
import { describe, test, expect } from 'manten';

const distDirectory = new URL('../../dist/', import.meta.url);
const sourceMapMarker = '//# sourceMappingURL=';

/**
 * Tools that symbolicate stack traces read the files in each frame and look
 * for a source map comment at the start of a line. tsx's own bundle must not
 * have one, or they try to decode the rest of that line as a source map.
 *
 * https://github.com/privatenumber/tsx/issues/877
 */
export const distSourceMap = () => describe('dist source map comments', () => {
	test('no built file has a line starting with a source map comment', async () => {
		const files = await fs.readdir(distDirectory, { recursive: true });
		const scripts = files.filter(file => /\.[cm]?js$/.test(file));
		expect(scripts.length).toBeGreaterThan(0);

		for (const file of scripts) {
			const content = await fs.readFile(new URL(file, distDirectory), 'utf8');
			const lines = content.split('\n');
			const markerLine = lines.findIndex(line => line.startsWith(sourceMapMarker));
			expect(markerLine === -1 ? file : `${file}:${markerLine + 1}`).toBe(file);
		}
	});
});
