declare const register: () => () => void;

declare const tsxRequire: {
    (id: string, fromFile: string | URL): any;
    resolve: {
        (id: string, fromFile: string | URL, options?: {
            paths?: string[] | undefined;
        }): string;
        paths: (request: string) => string[] | null;
    };
    main: NodeJS.Module | undefined;
    extensions: NodeJS.RequireExtensions;
    cache: NodeJS.Dict<NodeModule>;
};

export { register, tsxRequire as require };
