export const nodeVersions = [
	'21',
	...(
		(
			process.env.CI
			&& process.platform !== 'win32'
		)
			? [
				'20',
				'18',
			] as const
			: [] as const
	),
] as const;
