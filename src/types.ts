export type NodeError = Error & {
	code: string;
	url?: string;
	path?: string;
};
