import {
	typeFlag,
	type Flags,
	type TypeFlagOptions,
} from 'type-flag';

export const ignoreAfterArgument = (
	ignoreFirstArgument = true, // Used for watch
): TypeFlagOptions['ignore'] => {
	let ignore = false;

	return (type) => {
		if (
			ignore
			|| type === 'unknown-flag'
		) {
			return true;
		}

		if (type === 'argument') {
			ignore = true;
			return ignoreFirstArgument;
		}
	};
};

export const removeArgvFlags = (
	tsxFlags: Flags,
	argv = process.argv.slice(2),
) => {
	typeFlag(
		tsxFlags,
		argv,
		{
			ignore: ignoreAfterArgument(),
		},
	);

	return argv;
};
