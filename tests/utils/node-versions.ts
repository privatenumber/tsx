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
				'18.0.0',
			] as const
			: [] as const
	),
] as const;
