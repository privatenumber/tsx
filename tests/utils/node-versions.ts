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
				latestMajor('24.1.0'),
				latestMajor('23.11.1'),
				latestMajor('22.16.0'),
				latestMajor('21.7.3'),
				latestMajor('20.19.2'),
				latestMajor('18.20.3'),
			] as const
			: [] as const
	),
] as const;
