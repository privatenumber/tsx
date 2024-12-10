import type { TransformOptions } from 'esbuild';
import type { Backend } from '..';
import { createEsbuildEvalTransformSync } from './eval';
import { createEsbuildReplTransform } from './repl';
import { createEsbuildTransformSync, createEsbuildTransform } from './transform';

export default function getEsbuildBackend(esbuild: typeof import('esbuild')): Backend<TransformOptions> {
	return {
		evalTransformSync: createEsbuildEvalTransformSync(esbuild),
		replTransform: createEsbuildReplTransform(esbuild),
		transformSync: createEsbuildTransformSync(esbuild),
		transform: createEsbuildTransform(esbuild),
	}
}
