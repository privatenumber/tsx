import { PassThrough } from 'node:stream';
import { describe, expect, test } from 'manten';
import { processInteract } from '../utils/process-interact.js';

const createPassThrough = () => {
	const stdout = new PassThrough();
	return Object.assign(stdout, {
		[Symbol.dispose]: () => stdout.destroy(),
	});
};

export const processInteractSpec = () => describe('processInteract', () => {
	test('matches accumulated output across chunks', async () => {
		using stdout = createPassThrough();
		const interaction = processInteract(
			stdout,
			[
				({ output }) => output.includes('hello world'),
			],
			1000,
		);

		stdout.write('hello ');
		stdout.write('world');

		await interaction;
	});

	test('matches consecutive output actions from one chunk', async () => {
		const stdout = new PassThrough();
		const chunks: string[] = [];

		const interaction = processInteract(
			stdout,
			[
				({ chunk, output }) => {
					chunks.push(chunk);
					return output.includes('first');
				},
				({ chunk, output }) => {
					chunks.push(chunk);
					return output.includes('second');
				},
			],
			1000,
		);

		stdout.end('first second');

		await interaction;
		expect(chunks).toEqual(['first second', '']);
	});

	test('fails when the stream ends before the next action matches', async () => {
		const stdout = new PassThrough();
		const interaction = processInteract(
			stdout,
			[
				({ output }) => output.includes('finished'),
			],
			1000,
		);

		stdout.end('partial');

		await expect(interaction).rejects.toMatchObject({
			message: 'Stream ended while waiting for action 1/1',
			output: 'partial',
		});
	});
});
