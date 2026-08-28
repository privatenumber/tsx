import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readJsonFile } from '../read-json-file.js';
import { tmpdir } from '../temporary-directory.js';
import type { Transformed } from './apply-transformers.js';

const noop = () => {};
const getTime = () => Math.floor(Date.now() / 1e8);
const cacheFileNamePattern = /^(\d+)-[^-]+$/;
const retention = 7;
const expiryBatchSize = 64;

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

	private initialized = false;

	private expiring: Promise<void> | undefined;

	constructor(
		cacheDirectory = tmpdir,
		oldCacheDirectory = path.join(os.tmpdir(), 'tsx'),
	) {
		super();
		this.cacheDirectory = cacheDirectory;
		this.oldCacheDirectory = oldCacheDirectory;
	}

	private initialize() {
		if (this.initialized) {
			return;
		}

		// Handles race condition if multiple tsx instances are running (#22)
		fs.mkdirSync(this.cacheDirectory, { recursive: true });
		this.initialized = true;

		setImmediate(() => {
			this.expireDiskCache().catch(noop);
			this.removeOldCacheDirectory().catch(noop);
		}).unref();
	}

	override get(key: string) {
		const memoryCacheHit = super.get(key);

		if (memoryCacheHit) {
			return memoryCacheHit;
		}

		// Keep reads independent of cache size; writers own creation and maintenance.
		const time = getTime();
		for (let age = 0; age <= retention; age += 1) {
			const cachedResult = readJsonFile<ReturnType>(
				path.join(this.cacheDirectory, `${time - age}-${key}`),
			);

			if (cachedResult) {
				super.set(key, cachedResult);
				return cachedResult;
			}
			// A failed read can race a writer; don't delete it when trying older entries.
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
			this.initialize();

			fs.promises.writeFile(
				path.join(this.cacheDirectory, fileName),
				JSON.stringify(value),
			).catch(noop);
		}

		return this;
	}

	expireDiskCache() {
		this.initialize();
		this.expiring ??= this.expireEntries().finally(() => {
			this.expiring = undefined;
		});
		return this.expiring;
	}

	private async expireEntries() {
		const time = getTime();
		const directory = await fs.promises.opendir(this.cacheDirectory);
		const deletions: Promise<void>[] = [];
		let scanned = 0;

		// The async iterator closes the directory on completion or error.
		for await (const entry of directory) {
			const match = cacheFileNamePattern.exec(entry.name);
			if (match) {
				const entryTime = Number(match[1]);
				if (Number.isSafeInteger(entryTime) && time - entryTime > retention) {
					deletions.push(fs.promises.unlink(
						path.join(this.cacheDirectory, entry.name),
					).catch(noop));
				}
			}

			// Count all scanned entries, even when no files need deleting.
			scanned += 1;
			if (scanned === expiryBatchSize) {
				await Promise.all(deletions);
				deletions.length = 0;
				scanned = 0;
				await new Promise<void>((resolve) => {
					setImmediate(resolve).unref();
				});
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
