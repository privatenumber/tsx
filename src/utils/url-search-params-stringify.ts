export const urlSearchParamsStringify = (
	searchParams: URLSearchParams,
) => {
	// URLSearchParams#size not implemented in Node 18.0.0
	const size = Array.from(searchParams).length;
	return size > 0 ? `?${searchParams.toString()}` : '';
};
