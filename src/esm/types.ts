export type Message = {
	type: 'deactivated';
} | {
	type: 'load';
	url: string;
};
