import { describe, expect, test } from 'manten';
import { ptyShell } from '../utils/pty-shell/index.js';

export const ptyShellSpec = () => describe('ptyShell', () => {
	let previousShell: ReturnType<typeof ptyShell> | undefined;

	test('cleans up a timed-out attempt before retrying', async () => {
		if (previousShell) {
			const closePending = Symbol('close pending');
			const closeResult = await Promise.race([
				previousShell.close(),
				closePending,
			]);
			expect(closeResult).not.toBe(closePending);
			return;
		}

		await using shell = ptyShell();
		previousShell = shell;
		await shell.waitForLine(/output that never appears/);
	}, {
		timeout: 100,
		retry: 2,
	});
});
