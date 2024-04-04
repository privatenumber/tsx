/**
 * The specific version is used in CI because of caching
 * Only pull the latest major version in development
 * and upgrade manually for CI when needed
 */
const latestMajor = (version: string) => (process.env.CI ? version : version.split('.')[0]);

export const nodeVersions = [
	process.version,
	...(
		(
			process.env.CI
			&& process.platform !== 'win32'
		)
			? [
				latestMajor('21.7.2'),
				'21.0.0',
				latestMajor('20.12.0'),
				'20.0.0',
				latestMajor('18.20.0'),
				'18.0.0',
			] as const
			: [] as const
	),
] as const;
