export type NodeError = Error & {
	code: string;
	url?: string;
	path?: string;
};

export type RequiredProperty<Type, Keys extends keyof Type> = Type & { [P in Keys]-?: Type[P] };
