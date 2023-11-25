import path from 'path';
import { tmpdir } from '../tmp-dir.js';

export const getPipePath = (processId: number) => {
	const pipePath = path.join(tmpdir, `tsx_${processId}`);
	return (
		process.platform === 'win32'
			? '\\\\.\\pipe\\' + pipePath
			: pipePath
	);
};
