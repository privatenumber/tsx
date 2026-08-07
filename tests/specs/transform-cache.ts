import fs from 'node:fs';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { FileCache } from '../../src/utils/transform/cache.js';

type CacheValue = {
	value: string;
};

const getTime = () => Math.floor(Date.now() / 1e8);
const getKey = (index: number) => index.toString(16).padStart(40, '0');

export const transformCacheSpec = () => describe('transform cache', async () => {
	await test('does not access its directory before the first operation', async () => {
		await using fixture = await createFixture({
			'old-cache/sentinel': '',
		});
		const _cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('old-cache'),
		);

		await waitForImmediate();
		expect(await fixture.exists('cache')).toBe(false);
		expect(await fixture.exists('old-cache/sentinel')).toBe(true);
	});

	await test('creates its directory on the first operation', async () => {
		await using fixture = await createFixture();
		const cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('missing-old-cache'),
		);

		expect(cache.get(getKey(0))).toBeUndefined();
		expect(await fixture.exists('cache')).toBe(true);
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

		const originalUnlink = fs.promises.unlink;
		const unlinks: Promise<void>[] = [];
		fs.promises.unlink = ((...arguments_) => {
			const unlink = originalUnlink(...arguments_);
			unlinks.push(unlink);
			return unlink;
		}) as typeof fs.promises.unlink;
		try {
			expect(cache.get(key)).toStrictEqual({ value: 'older valid' });
			await Promise.all(unlinks);
		} finally {
			fs.promises.unlink = originalUnlink;
		}
	});

	await test('removes every expired entry without removing fresh entries', async () => {
		const time = getTime();
		const expiredKey = getKey(1);
		const freshKey = getKey(2);
		const olderExpiredFile = `${time - 9}-${expiredKey}`;
		const newerExpiredFile = `${time - 8}-${expiredKey}`;
		const freshFile = `${time}-${freshKey}`;
		await using fixture = await createFixture({
			[`cache/${olderExpiredFile}`]: JSON.stringify({ value: 'older expired' }),
			[`cache/${newerExpiredFile}`]: JSON.stringify({ value: 'newer expired' }),
			[`cache/${freshFile}`]: JSON.stringify({ value: 'fresh' }),
		});
		const cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('old-cache'),
		);

		expect(cache.get(expiredKey)).toStrictEqual({ value: 'newer expired' });
		await cache.expireDiskCache();
		expect(await fixture.readdir('cache')).toStrictEqual([freshFile]);
		expect(cache.diskCacheEntries?.map(entry => entry.fileName)).toStrictEqual([freshFile]);
		await cache.expireDiskCache();
		expect(await fixture.readdir('cache')).toStrictEqual([freshFile]);

		cache.delete(expiredKey);
		expect(cache.get(expiredKey)).toBeUndefined();
	});

	await test('initializes safely when expiration is called directly', async () => {
		await using fixture = await createFixture();
		const cache = new FileCache<CacheValue>(
			fixture.getPath('cache'),
			fixture.getPath('old-cache'),
		);

		await cache.expireDiskCache();
		expect(await fixture.exists('cache')).toBe(true);
		expect(cache.diskCacheEntries).toStrictEqual([]);
	});

	await test('preserves concurrent writes from separate cache instances', async () => {
		await using fixture = await createFixture();
		const cacheDirectory = fixture.getPath('cache');
		const oldCacheDirectory = fixture.getPath('old-cache');
		const firstCache = new FileCache<CacheValue>(cacheDirectory, oldCacheDirectory);
		const secondCache = new FileCache<CacheValue>(cacheDirectory, oldCacheDirectory);
		firstCache.get(getKey(0));
		secondCache.get(getKey(0));

		const originalWriteFile = fs.promises.writeFile;
		const writes: Promise<void>[] = [];
		fs.promises.writeFile = ((...arguments_) => {
			const write = originalWriteFile(...arguments_);
			writes.push(write);
			return write;
		}) as typeof fs.promises.writeFile;
		try {
			firstCache.set(getKey(1), { value: 'first' });
			firstCache.set(getKey(1), { value: 'first' });
			secondCache.set(getKey(2), { value: 'second' });
			await Promise.all(writes);
		} finally {
			fs.promises.writeFile = originalWriteFile;
		}
		expect(firstCache.diskCacheEntries?.map(entry => entry.key)).toStrictEqual([getKey(1)]);
		expect(secondCache.diskCacheEntries?.map(entry => entry.key)).toStrictEqual([getKey(2)]);

		const reader = new FileCache<CacheValue>(cacheDirectory, oldCacheDirectory);
		expect(reader.get(getKey(1))).toStrictEqual({ value: 'first' });
		expect(reader.get(getKey(2))).toStrictEqual({ value: 'second' });
	});
});
