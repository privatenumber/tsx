import {
	typeFlag,
	type Flags,
	type TypeFlagOptions,
} from 'type-flag';

export const ignoreAfterArgument = (): TypeFlagOptions['ignore'] => {
	let ignore = false;

	return (type) => {
		if (ignore) {
			return true;
		}
		const isArgument = type === 'argument';
		if (isArgument || type === 'unknown-flag') {
			ignore = isArgument;
			return true;
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
