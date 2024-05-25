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
				latestMajor('22.1.0'),
				'22.0.0',
				latestMajor('21.7.3'),
				'21.0.0',
				latestMajor('20.12.2'),
				'20.0.0',
				latestMajor('18.20.2'),
				'18.0.0',
			] as const
			: [] as const
	),
] as const;
