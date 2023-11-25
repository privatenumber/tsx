import path from 'path';
import { tmpdir } from '../temporary-directory.js';

export const getPipePath = (processId: number) => {
	const pipePath = path.join(tmpdir, `tsx_${processId}`);
	return (
		process.platform === 'win32'
			? `\\\\.\\pipe\\${pipePath}`
			: pipePath
	);
};
