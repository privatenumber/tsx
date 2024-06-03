import path from 'node:path';
import os from 'node:os';

const { geteuid } = process;
const userId = geteuid ? geteuid() : os.userInfo().username;
const tmpdir = path.join(os.tmpdir(), `tsx-${userId}`);

export { tmpdir as t };
