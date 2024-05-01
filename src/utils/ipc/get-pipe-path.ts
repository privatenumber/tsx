import path from 'node:path';
import { tmpdir } from '../temporary-directory.js';
import { isWindows } from '../is-windows.js';

export const getPipePath = (processId: number) => {
	const pipePath = path.join(tmpdir, `${processId}.pipe`);
	return (
		isWindows
			? `\\\\?\\pipe\\${pipePath}`
			: pipePath
	);
};
