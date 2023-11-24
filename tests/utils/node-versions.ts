/**
 * The specific version is used in CI because of caching
 * Only pull the latest major version in development
 * and upgrade manually for CI when needed
 */
const latestMajor = (version: string) => (process.env.CI ? version : version.split('.')[0]);

export const nodeVersions = [
	latestMajor('21.2.0'),
	...(
		(
			process.env.CI
			&& process.platform !== 'win32'
		)
			? [
				latestMajor('20.10.0'),
				latestMajor('18.18.2'),
				'18.0.0',
			] as const
			: [] as const
	),
] as const;
