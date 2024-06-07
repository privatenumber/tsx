export type NodeError = Error & {
	code: string;
};

export type RequiredProperty<Type, Keys extends keyof Type> = Type & { [P in Keys]-?: Type[P] };
