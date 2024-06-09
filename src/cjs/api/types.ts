import type Module from 'module';

export type ResolveFilename = typeof Module._resolveFilename;

export type SimpleResolve = (request: string) => string;
