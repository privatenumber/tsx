import { describe, setProcessTimeout } from 'manten';
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
import { commonJsModeContracts } from './specs/commonjs-mode-contracts';
import { versionSensitiveTests } from './specs/version-sensitive';

(async () => {
	// Prevent stuck CI runs
	setProcessTimeout(5 * 60 * 1000);

	await describe('tsx', async () => {
		await repl();
		await transformSpec();

		const [primaryNodeVersion, ...compatNodeVersions] = nodeVersions;
		const primaryNode = await createNode(primaryNodeVersion);

		// The primary Node version runs all suites sequentially.
		// Process-heavy suites (cli signals, watch file watchers, PTY shells)
		// cause cross-suite interference when run concurrently on CI.
		await describe(`Node ${primaryNode.version} (full suite)`, async () => {
			await versionSensitiveTests(primaryNode);
			await commonJsModeContracts(primaryNode);
			await smoke(primaryNode);
			await api(primaryNode);
			await cli(primaryNode);
			await watch(primaryNode);
			await loaders(primaryNode);
			await tsconfig(primaryNode);
		});

		// Other Node versions only run version-sensitive tests
		for (const nodeVersion of compatNodeVersions) {
			const node = await createNode(nodeVersion);
			await describe(`Node ${node.version}`, () => {
				versionSensitiveTests(node);
			});
		}
	});
})();
