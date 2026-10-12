import type { FSWatcher } from 'chokidar';

/**
 * chokidar v3 doesn't deduplicate `.add()`: on macOS, its FSEvents backend
 * appends another listener to the shared FSEvents container and another closer
 * to `_closers[path]` on every call for a path it already holds.
 *
 * The child announces every loaded module over IPC on each boot, so re-adding
 * the paths the watcher already holds grows the parent's heap on every restart
 * until it exhausts it.
 *
 * https://github.com/privatenumber/tsx/issues/855
 */
export const trackWatchedPaths = (
	watcher: FSWatcher,
	getPathKey: (filePath: string) => string,
) => {
	const watchedPaths = new Set<string>();

	return (filePaths: string | string[]) => {
		const newPaths = (
			Array.isArray(filePaths) ? filePaths : [filePaths]
		).filter((filePath) => {
			const pathKey = getPathKey(filePath);
			if (watchedPaths.has(pathKey)) {
				return false;
			}
			watchedPaths.add(pathKey);
			return true;
		});

		if (newPaths.length > 0) {
			watcher.add(newPaths);
		}
	};
};
