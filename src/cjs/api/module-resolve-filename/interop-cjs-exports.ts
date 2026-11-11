import Module from 'node:module';

const dataJavascriptMime = 'data:text/javascript';

const readFilePathMetadata = (
	search: string,
) => new URLSearchParams(search).get('filePath') ?? undefined;

export const getOriginalFilePath = (
	request: string,
) => {
	if (!request.startsWith(dataJavascriptMime)) {
		return;
	}

	const fragmentIndex = request.indexOf('#');
	if (fragmentIndex !== -1) {
		const filePath = readFilePathMetadata(request.slice(fragmentIndex + 1));
		if (filePath) {
			return filePath;
		}
	}

	// Metadata is appended after the payload. Use the last occurrence so an encoded
	// payload cannot be mistaken for the real filePath query on newer Node versions.
	const filePathParam = '?filePath=';
	const filePathIndex = request.lastIndexOf(filePathParam);
	if (filePathIndex === -1) {
		return;
	}

	return readFilePathMetadata(request.slice(filePathIndex + 1));
};

export const interopCjsExports = (
	request: string,
) => {
	const filePath = getOriginalFilePath(request);
	if (filePath) {
		// The CJS module cache needs to be updated with the actual path for export parsing to work
		// https://github.com/nodejs/node/blob/v22.2.0/lib/internal/modules/esm/translators.js#L338
		Module._cache[filePath] = Module._cache[request];
		delete Module._cache[request];
		request = filePath;
	}
	return request;
};
