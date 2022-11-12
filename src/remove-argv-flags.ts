import {
	typeFlag,
	type Flags,
	type TypeFlagOptions,
} from 'type-flag';

export const ignoreAfterArgument = (
	ignoreFirstArgument = true,
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

export function removeArgvFlags(
	tsxFlags: Flags,
	argv = process.argv.slice(2),
) {
	typeFlag(
		tsxFlags,
		argv,
		{
			ignore: ignoreAfterArgument(),
		},
	);

	return argv;
}
