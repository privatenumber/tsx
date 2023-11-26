import path from 'path';
import { tmpdir } from '../temporary-directory.js';

console.log(tmpdir);
export const getPipePath = (processId: number) => {
	const pipePath = path.join(tmpdir, `${processId}.pipe`);
	return (
		process.platform === 'win32'
			? `\\\\.\\pipe\\${pipePath}`
			: pipePath
	);
};
