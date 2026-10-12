import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { spyOn } from 'tinyspy';
import { FSWatcher } from 'chokidar';
import { trackWatchedPaths } from '../../src/watch/watched-paths.js';

const getPathKey = (filePath: string) => path.resolve(filePath);

export const watchedPathsSpec = () => describe('watched paths', async () => {
	await test('adds a path once however many times it is announced', () => {
		const watcher = { add: () => {} } as unknown as FSWatcher;
		const add = spyOn(watcher, 'add');
		const addWatchPath = trackWatchedPaths(watcher, getPathKey);

		addWatchPath('/project/dependency.ts');
		addWatchPath('/project/dependency.ts');
		addWatchPath('/project/dependency.ts');

		expect(add.callCount).toBe(1);
		expect(add.calls[0]).toStrictEqual([['/project/dependency.ts']]);
	});

	await test('passes on only the paths that are new to the watcher', () => {
		const watcher = { add: () => {} } as unknown as FSWatcher;
		const add = spyOn(watcher, 'add');
		const addWatchPath = trackWatchedPaths(watcher, getPathKey);

		addWatchPath(['/project/index.ts', '/project/a.ts']);
		addWatchPath(['/project/a.ts', '/project/b.ts']);
		addWatchPath(['/project/a.ts', '/project/b.ts']);

		expect(add.callCount).toBe(2);
		expect(add.calls[0]).toStrictEqual([['/project/index.ts', '/project/a.ts']]);
		expect(add.calls[1]).toStrictEqual([['/project/b.ts']]);
	});

	await test('matches paths by resolved path, not by spelling', () => {
		const watcher = { add: () => {} } as unknown as FSWatcher;
		const add = spyOn(watcher, 'add');
		const addWatchPath = trackWatchedPaths(watcher, getPathKey);

		addWatchPath('/project/dependency.ts');
		addWatchPath('/project/nested/../dependency.ts');

		expect(add.callCount).toBe(1);
	});

	/**
	 * The leak itself: chokidar v3 registers another closer (and, on the FSEvents
	 * backend, another listener on the shared FSEvents container) for every
	 * `.add()` of a path it already watches.
	 *
	 * https://github.com/privatenumber/tsx/issues/855
	 */
	await test('does not accumulate chokidar watch handles across restarts', async () => {
		await using fixture = await createFixture({
			'index.ts': 'export default 1',
			'dependency.ts': 'export default 2',
		});
		const dependencies = [
			fixture.getPath('index.ts'),
			fixture.getPath('dependency.ts'),
		];

		const watcher = new FSWatcher({
			cwd: fixture.path,
			ignoreInitial: true,
			disableGlobbing: true,
			ignorePermissionErrors: true,
		});
		const addWatchPath = trackWatchedPaths(watcher, getPathKey);
		try {
			addWatchPath(dependencies);
			await new Promise<void>((resolve) => {
				watcher.once('ready', resolve);
			});

			const countWatchHandles = () => {
				let handles = 0;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				for (const closers of (watcher as any)._closers.values()) {
					handles += closers.length;
				}
				return handles;
			};
			const initialHandles = countWatchHandles();

			// Every restart re-announces the same dependencies over IPC
			for (let restart = 0; restart < 5; restart += 1) {
				addWatchPath(dependencies);
				// chokidar registers the watch handles asynchronously
				await setTimeout(100);
			}

			expect(countWatchHandles()).toBe(initialHandles);
		} finally {
			await watcher.close();
		}
	});
});
