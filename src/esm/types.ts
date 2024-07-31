export type Message = {
	type: 'deactivated';
} | {
	type: 'load';
	url: string;
};

export type TsxRequest = {
	namespace: string;
	parentURL: string;
	specifier: string;
};
