export const nodeVersions = [
	'20',
	...(
		(
			process.env.CI
			&& process.platform !== 'win32'
		)
			? [
				'18',
			] as const
			: [] as const
	),
] as const;
