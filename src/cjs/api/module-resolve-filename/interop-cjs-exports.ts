import Module from 'node:module';

export const getOriginalFilePath = (
	request: string,
) => {
	if (!request.startsWith('data:text/javascript,')) {
		return;
	}

	const queryIndex = request.indexOf('?');
	if (queryIndex === -1) {
		return;
	}

	const searchParams = new URLSearchParams(request.slice(queryIndex + 1));
	const filePath = searchParams.get('filePath');
	if (filePath) {
		return filePath;
	}
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
