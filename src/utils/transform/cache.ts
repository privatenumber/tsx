import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readJsonFile } from '../read-json-file.js';
import { tmpdir } from '../temporary-directory.js';
import type { Transformed } from './apply-transformers.js';

const noop = () => {};
const getTime = () => Math.floor(Date.now() / 1e8);
const cacheFileNamePattern = /^(\d+)-([^-]+)$/;

type DiskCacheEntry = {
	time: number;
	key: string;
	fileName: string;
};

export class FileCache<ReturnType> extends Map<string, ReturnType> {
	/**
	 * By using tmpdir, the expectation is for the OS to clean any files
	 * that haven't been read for a while.
	 *
	 * macOS - 3 days: https://superuser.com/a/187105
	 * Linux - https://serverfault.com/a/377349
	 *
	 * Note on Windows, temp files are not cleaned up automatically.
	 * https://superuser.com/a/1599897
	 */
	cacheDirectory: string;

	// Maintained so we can remove it on Windows
	oldCacheDirectory: string;

	// Full entry list is retained so duplicate files are also expired.
	diskCacheIndex: Map<string, DiskCacheEntry> | undefined;

	diskCacheEntries: DiskCacheEntry[] | undefined;

	constructor(
		cacheDirectory = tmpdir,
		oldCacheDirectory = path.join(os.tmpdir(), 'tsx'),
	) {
		super();
		this.cacheDirectory = cacheDirectory;
		this.oldCacheDirectory = oldCacheDirectory;
	}

	getDiskCacheIndex() {
		if (this.diskCacheIndex) {
			return this.diskCacheIndex;
		}

		// Handles race condition if multiple tsx instances are running (#22)
		fs.mkdirSync(this.cacheDirectory, { recursive: true });

		const diskCacheIndex = new Map<string, DiskCacheEntry>();
		const diskCacheEntries: DiskCacheEntry[] = [];
		for (const fileName of fs.readdirSync(this.cacheDirectory)) {
			const match = cacheFileNamePattern.exec(fileName);
			if (!match) {
				continue;
			}

			const time = Number(match[1]);
			if (!Number.isSafeInteger(time)) {
				continue;
			}

			const key = match[2];
			const entry = {
				time,
				key,
				fileName,
			};
			diskCacheEntries.push(entry);

			const duplicate = diskCacheIndex.get(key);
			if (!duplicate || duplicate.time < time) {
				diskCacheIndex.set(key, entry);
			}
		}
		this.diskCacheIndex = diskCacheIndex;
		this.diskCacheEntries = diskCacheEntries;

		setImmediate(() => {
			this.expireDiskCache().catch(noop);
			this.removeOldCacheDirectory().catch(noop);
		});

		return diskCacheIndex;
	}

	private removeDiskCacheEntry(entry: DiskCacheEntry) {
		const entryIndex = this.diskCacheEntries!.indexOf(entry);
		if (entryIndex !== -1) {
			this.diskCacheEntries!.splice(entryIndex, 1);
		}

		if (this.diskCacheIndex!.get(entry.key) === entry) {
			let replacement: DiskCacheEntry | undefined;
			for (const remainingEntry of this.diskCacheEntries!) {
				if (
					remainingEntry.key === entry.key
					&& (!replacement || remainingEntry.time > replacement.time)
				) {
					replacement = remainingEntry;
				}
			}

			if (replacement) {
				this.diskCacheIndex!.set(entry.key, replacement);
			} else {
				this.diskCacheIndex!.delete(entry.key);
			}
		}
	}

	override get(key: string) {
		const memoryCacheHit = super.get(key);

		if (memoryCacheHit) {
			return memoryCacheHit;
		}

		const diskCacheIndex = this.getDiskCacheIndex();
		let diskCacheHit = diskCacheIndex.get(key);
		while (diskCacheHit) {
			const cacheFilePath = path.join(this.cacheDirectory, diskCacheHit.fileName);
			const cachedResult = readJsonFile<ReturnType>(cacheFilePath);

			if (cachedResult) {
				// Load it into memory
				super.set(key, cachedResult);
				return cachedResult;
			}

			// Ignore broken files immediately so an older valid entry can be used.
			this.removeDiskCacheEntry(diskCacheHit);
			fs.promises.unlink(cacheFilePath).catch(noop);
			diskCacheHit = diskCacheIndex.get(key);
		}
	}

	override set(key: string, value: ReturnType) {
		super.set(key, value);

		if (value) {
			/**
			 * Time is inaccurate by ~27.7 hours to minimize data
			 * and because this level of fidelity wont matter
			 */
			const time = getTime();
			const fileName = `${time}-${key}`;
			const diskCacheIndex = this.getDiskCacheIndex();
			const entry = {
				time,
				key,
				fileName,
			};

			fs.promises.writeFile(
				path.join(this.cacheDirectory, fileName),
				JSON.stringify(value),
			).then(
				() => {
					const previousEntry = diskCacheIndex.get(key);
					if (previousEntry?.fileName === fileName) {
						this.removeDiskCacheEntry(previousEntry);
					}
					diskCacheIndex.set(key, entry);
					this.diskCacheEntries!.push(entry);
				},
				noop,
			);
		}

		return this;
	}

	async expireDiskCache() {
		this.getDiskCacheIndex();
		const time = getTime();
		const deletions: Promise<void>[] = [];

		for (const cache of this.diskCacheEntries!) {
			if ((time - cache.time) > 7) {
				deletions.push(fs.promises.unlink(
					path.join(this.cacheDirectory, cache.fileName),
				).then(
					() => this.removeDiskCacheEntry(cache),
					noop,
				));
			}
		}

		await Promise.all(deletions);
	}

	async removeOldCacheDirectory() {
		try {
			const exists = await fs.promises.access(this.oldCacheDirectory).then(() => true);
			if (exists) {
				if ('rm' in fs.promises) {
					await fs.promises.rm(
						this.oldCacheDirectory,
						{
							recursive: true,
							force: true,
						},
					);
				} else {
					await fs.promises.rmdir(
						this.oldCacheDirectory,
						{ recursive: true },
					);
				}
			}
		} catch {}
	}
}

export default (
	process.env.TSX_DISABLE_CACHE
		? new Map<string, Transformed>()
		: new FileCache<Transformed>()
);
