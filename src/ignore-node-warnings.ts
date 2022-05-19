import { Transform } from 'stream';

const warningTraceTip = '(Use `node --trace-warnings ...` to show where the warning was created)';
const nodeWarningPattern = /^\(node:\d+\) (.+)\n/m;
const warningsToIgnore = [
	'ExperimentalWarning: --experimental-loader is an experimental feature. This feature could change at any time',
	'ExperimentalWarning: Custom ESM Loaders is an experimental feature. This feature could change at any time',
	'ExperimentalWarning: Importing JSON modules is an experimental feature. This feature could change at any time',
];

export const ignoreNodeWarnings = () => {
	let filterStderr = true;
	let counter = 0;

	return new Transform({
		transform(chunk, _, callback) {
			if (!filterStderr) {
				return callback(null, chunk);
			}

			counter += 1;

			// Only filter first 10
			if (counter > 10) {
				filterStderr = false;
			}

			const stderrLog = chunk.toString();
			const nodeWarning = stderrLog.match(nodeWarningPattern);
			if (!nodeWarning) {
				return callback(null, chunk);
			}

			const [, warningMessage] = nodeWarning;
			const ignoreWarning = warningsToIgnore.indexOf(warningMessage);
			if (ignoreWarning === -1) {
				return callback(null, chunk);
			}

			if (warningsToIgnore.length === 0) {
				filterStderr = false;
			}

			const newWarning = stderrLog
				.replace(nodeWarningPattern, '')
				.replace(warningTraceTip, '')
				.trim();

			callback(null, newWarning);
		},
	});
};
