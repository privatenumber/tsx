type Options$1 = {
    namespace?: string;
    onImport?: (url: string) => void;
};
declare const register: (options?: Options$1) => () => Promise<void>;

type Options = {
    parentURL: string;
    onImport?: (url: string) => void;
};
declare const tsImport: (specifier: string, options: string | Options) => Promise<any>;

export { register, tsImport };
