import path from 'path';
import os from 'os';

/**
 * Cache directory is based on the user's identifier
 * to avoid permission issues when accessed by a different user
 */
const { geteuid } = process;
const userId = (
	geteuid
		// For Linux users with virtual users on CI (e.g. Docker)
		? geteuid()

		// Use username on Windows because it doesn't have id
		: os.userInfo().username
);

/**
 * This ensures that the cache directory is unique per user
 * and has the appropriate permissions
 */
export const tmpdir = path.join(os.tmpdir(), `tsx-${userId}`);
