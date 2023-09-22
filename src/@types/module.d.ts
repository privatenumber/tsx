import 'module';

declare global {
	namespace NodeJS {
		export interface Module {
			_compile(code: string, filename: string): string;
		}
	}
}

declare module 'module' {
	export const _extensions: NodeJS.RequireExtensions;

	export type Parent = {
		/**
		 * Can be null if the parent id is 'internal/preload' (e.g. via --require)
		 * which doesn't have a file path.
		 */
		filename: string | null;
	};

	export function _resolveFilename(
		request: string,
		parent: Parent,
		isMain: boolean,
		options?: Record<PropertyKey, unknown>,
	): string;
}
