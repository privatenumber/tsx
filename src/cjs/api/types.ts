import type Module from 'module';

export type LoaderState = {
	enabled: boolean;
};

export type ResolveFilename = typeof Module._resolveFilename;

export type SimpleResolve = (request: string) => string;
