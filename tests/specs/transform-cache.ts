import fs from 'node:fs';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import {
	describe, test, expect, onTestFinish,
} from 'manten';
import { createFixture } from 'fs-fixture';
import { spyOn } from 'tinyspy';
import { FileCache } from '../../src/utils/transform/cache.js';

type CacheValue = {
	value: string;
};

const getTime = () => Math.floor(Date.now() / 1e8);
const getKey = (index: number) => index.toString(16).padStart(40, '0');

export const transformCacheSpec = () => describe('transform cache', async () => {
	await test('does not call readdirSync during lookup', async () => {
		await using fixture = await createFixture();
		const cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('old-cache'),
		);
		const readDirectory = spyOn(fs, 'readdirSync');
		onTestFinish(readDirectory.restore);

		expect(cache.get(getKey(0))).toBeUndefined();
		expect(readDirectory.callCount).toBe(0);
	});

	await test('does not create or maintain directories for read-only misses', async () => {
		await using fixture = await createFixture({
			'old-cache/sentinel': '',
		});
		const cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('old-cache'),
		);

		expect(cache.get(getKey(0))).toBeUndefined();
		await waitForImmediate();
		expect(await fixture.exists('cache')).toBe(false);
		expect(await fixture.exists('old-cache/sentinel')).toBe(true);
	});

	await test('finds a warm entry among many unrelated entries', async () => {
		const time = getTime();
		const targetKey = 'f'.repeat(40);
		const files = Object.fromEntries(Array.from(
			{ length: 2000 },
			(_, index) => [
				`cache/${time}-${getKey(index)}`,
				JSON.stringify({ value: `unrelated-${index}` }),
			],
		));
		files[`cache/${time}-${targetKey}`] = JSON.stringify({ value: 'target' });
		await using fixture = await createFixture(files);
		const cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('old-cache'),
		);

		expect(cache.get(targetKey)).toStrictEqual({ value: 'target' });
	});

	await test('ignores malformed cache file names', async () => {
		const time = getTime();
		const invalidTimeKey = getKey(1);
		const extraSegmentKey = getKey(2);
		const validKey = getKey(3);
		await using fixture = await createFixture({
			'cache/not-a-cache-file': '{}',
			[`cache/invalid-${invalidTimeKey}`]: JSON.stringify({ value: 'invalid time' }),
			[`cache/${time}-${extraSegmentKey}-extra`]: JSON.stringify({ value: 'extra segment' }),
			[`cache/${time}-${validKey}`]: JSON.stringify({ value: 'valid' }),
		});
		const cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('old-cache'),
		);

		expect(cache.get(invalidTimeKey)).toBeUndefined();
		expect(cache.get(extraSegmentKey)).toBeUndefined();
		expect(cache.get(validKey)).toStrictEqual({ value: 'valid' });
	});

	await test('falls back when the newest cache entry is corrupt', async () => {
		const time = getTime();
		const key = getKey(1);
		await using fixture = await createFixture({
			[`cache/${time - 1}-${key}`]: JSON.stringify({ value: 'older valid' }),
			[`cache/${time}-${key}`]: 'invalid JSON',
		});
		const cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('old-cache'),
		);

		expect(cache.get(key)).toStrictEqual({ value: 'older valid' });
		await waitForImmediate();
		expect(await fixture.readFile(`cache/${time}-${key}`, 'utf8')).toBe('invalid JSON');
	});

	await test('only reads entries in the live retention window', async () => {
		const time = getTime();
		await using fixture = await createFixture({
			[`cache/${time - 7}-${getKey(1)}`]: JSON.stringify({ value: 'live' }),
			[`cache/${time - 8}-${getKey(2)}`]: JSON.stringify({ value: 'expired' }),
			[`cache/${time + 1}-${getKey(3)}`]: JSON.stringify({ value: 'future' }),
			[`cache/${time}-${getKey(4)}`]: 'invalid JSON',
			[`cache/${time - 8}-${getKey(4)}`]: JSON.stringify({ value: 'expired fallback' }),
		});
		const cache = new FileCache<CacheValue>(fixture.getPath('cache'), fixture.getPath('old-cache'));

		expect(cache.get(getKey(1))).toStrictEqual({ value: 'live' });
		expect(cache.get(getKey(2))).toBeUndefined();
		expect(cache.get(getKey(3))).toBeUndefined();
		expect(cache.get(getKey(4))).toBeUndefined();
	});

	await test('updates the lookup window when the time bucket rolls over', async () => {
		const time = getTime();
		await using fixture = await createFixture({
			[`cache/${time}-${getKey(1)}`]: JSON.stringify({ value: 'current' }),
			[`cache/${time - 7}-${getKey(2)}`]: JSON.stringify({ value: 'boundary' }),
			[`cache/${time + 1}-${getKey(3)}`]: JSON.stringify({ value: 'next' }),
		});
		const cache = new FileCache<CacheValue>(fixture.getPath('cache'), fixture.getPath('old-cache'));
		const dateNow = spyOn(Date, 'now');
		try {
			dateNow.willCall(() => time * 1e8);
			expect(cache.get(getKey(2))).toStrictEqual({ value: 'boundary' });
			expect(cache.get(getKey(3))).toBeUndefined();
			cache.delete(getKey(2));

			dateNow.willCall(() => (time + 1) * 1e8);
			expect(cache.get(getKey(1))).toStrictEqual({ value: 'current' });
			expect(cache.get(getKey(2))).toBeUndefined();
			expect(cache.get(getKey(3))).toStrictEqual({ value: 'next' });
		} finally {
			dateNow.restore();
		}
	});

	await test('prefers the newest valid entry and retains it in memory', async () => {
		const time = getTime();
		const key = getKey(1);
		await using fixture = await createFixture({
			[`cache/${time - 1}-${key}`]: JSON.stringify({ value: 'older' }),
			[`cache/${time}-${key}`]: JSON.stringify({ value: 'newest' }),
		});
		const cache = new FileCache<CacheValue>(fixture.getPath('cache'), fixture.getPath('old-cache'));

		const value = cache.get(key);
		expect(value).toStrictEqual({ value: 'newest' });
		await fs.promises.unlink(fixture.getPath(`cache/${time}-${key}`));
		await fs.promises.unlink(fixture.getPath(`cache/${time - 1}-${key}`));
		expect(cache.get(key)).toBe(value);
	});

	await test('streams every expired duplicate while preserving other entries', async () => {
		const time = getTime();
		const files: Record<string, string> = {};
		const preserved: string[] = [];
		for (let index = 0; index < 130; index += 1) {
			const key = getKey(index);
			files[`cache/${time - 9}-${key}`] = '{}';
			files[`cache/${time - 8}-${key}`] = '{}';
			for (const name of [`${time - 7}-${key}`, `${time}-${key}`, `${time + 1}-${key}`, `malformed-${key}`]) {
				files[`cache/${name}`] = JSON.stringify({ value: 'preserved' });
				preserved.push(name);
			}
		}
		const unsafeTime = `99999999999999999999-${getKey(0)}`;
		files[`cache/${unsafeTime}`] = '{}';
		preserved.push(unsafeTime);
		// An individual unlink failure must not interrupt the rest of the sweep.
		const directory = `${time - 8}-directory`;
		files[`cache/${directory}/sentinel`] = '';
		preserved.push(directory);
		await using fixture = await createFixture(files);
		const cache = new FileCache<CacheValue>(fixture.getPath('cache'), fixture.getPath('old-cache'));

		await cache.expireDiskCache();
		const remaining = await fixture.readdir('cache');
		expect(remaining.sort()).toStrictEqual(preserved.sort());
		expect(cache.get(getKey(0))).toStrictEqual({ value: 'preserved' });
	});

	await test('initializes safely when expiration is called directly', async () => {
		await using fixture = await createFixture();
		const cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('old-cache'),
		);

		await cache.expireDiskCache();
		expect(await fixture.exists('cache')).toBe(true);
		expect(await fixture.readdir('cache')).toStrictEqual([]);
	});

	await test('preserves concurrent writes from separate cache instances', async () => {
		await using fixture = await createFixture();
		const cacheDirectory = fixture.getPath('cache');
		const oldCacheDirectory = fixture.getPath('old-cache');
		const firstCache = new FileCache<CacheValue>(cacheDirectory, oldCacheDirectory);
		const secondCache = new FileCache<CacheValue>(cacheDirectory, oldCacheDirectory);
		const reader = new FileCache<CacheValue>(cacheDirectory, oldCacheDirectory);
		expect(reader.get(getKey(1))).toBeUndefined();
		expect(reader.get(getKey(2))).toBeUndefined();

		const writeFile = spyOn(fs.promises, 'writeFile');
		onTestFinish(writeFile.restore);

		firstCache.set(getKey(1), { value: 'first' });
		firstCache.set(getKey(1), { value: 'first' });
		secondCache.set(getKey(2), { value: 'second' });
		await Promise.all(writeFile.returns);
		expect(await fixture.readdir('cache')).toHaveLength(2);
		expect(reader.get(getKey(1))).toStrictEqual({ value: 'first' });
		expect(reader.get(getKey(2))).toStrictEqual({ value: 'second' });
	});
});
