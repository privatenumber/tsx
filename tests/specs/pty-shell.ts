import { setTimeout } from 'node:timers/promises';
import { describe, expect, test } from 'manten';
import { isWindows, ptyShell } from '../utils/pty-shell/index.js';

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

	test('waits for completed lines', async () => {
		await using shell = ptyShell();

		await shell.waitForPrompt();
		const line = shell.waitForLine(/^PARTIAL_LINE$/);
		shell.type(isWindows
			? 'Write-Host -NoNewline PARTIAL_LINE; Start-Sleep -Milliseconds 100; Write-Host'
			: String.raw`printf PARTIAL_LINE; sleep 0.1; printf '\n'`);

		while (!shell.getOutput().endsWith('PARTIAL_LINE')) {
			await setTimeout(1);
		}

		const resolvedBeforeNewline = await Promise.race([
			line.then(() => true),
			setTimeout(0).then(() => false),
		]);
		expect(resolvedBeforeNewline).toBe(false);
		await line;
	});
});
