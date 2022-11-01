import { typeFlag, type Flags } from 'type-flag';

export function removeArgvFlags(
	tsxFlags: Flags,
	argv = process.argv.slice(2),
) {
	let ignoreAfterArguments = false;
	typeFlag(
		tsxFlags,
		argv,
		{
			ignore(type) {
				if (ignoreAfterArguments) {
					return true;
				}
				const isArgument = type === 'argument';
				if (isArgument || type === 'unknown-flag') {
					ignoreAfterArguments = isArgument;
					return true;
				}
			},
		},
	);

	return argv;
}
