import { describe } from 'manten';
import { createNode } from './utils/tsx';
import { nodeVersions } from './utils/node-versions';
import { smoke } from './specs/smoke';
import { api } from './specs/api';
import { cli } from './specs/cli';
import { watch } from './specs/watch';
import { loaders } from './specs/loaders';
import { repl } from './specs/repl';
import { tsconfig } from './specs/tsconfig';
import { transformSpec } from './specs/transform';

(async () => {
	await describe('tsx', async () => {
		await repl();
		await transformSpec();

		for (const nodeVersion of nodeVersions) {
			const node = await createNode(nodeVersion);
			await describe(`Node ${node.version}`, () => {
				smoke(node);
				api(node);
				cli(node);
				watch(node);
				loaders(node);
				tsconfig(node);
			});
		}
	});
})();
