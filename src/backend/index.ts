import esbuild from 'esbuild';
import type { Transformed } from '../utils/transform/apply-transformers';

import getEsbuildBackend from './esbuild';

export interface Backend<ExtendedTransformOptions> {
	evalTransformSync: (evalCode: string, inputType?: string) => string;
	replTransform: (code: string, filename: string) => Promise<string>;
	transformSync: (
		code: string,
		filePath: string,
		extendOptions?: ExtendedTransformOptions,
	) => Transformed;
	transform: (
		code: string,
		filePath: string,
		extendOptions?: ExtendedTransformOptions,
	) => Promise<Transformed>;
}

const backend = getEsbuildBackend(esbuild);

export default backend;
