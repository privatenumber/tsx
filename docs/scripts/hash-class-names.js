import fs from 'node:fs/promises';
import path from 'node:path';

const TARGET_CLASSES = ['VPDocAside'];
const ALLOWED_EXTENSIONS = new Set(['.css', '.js', '.vue']);
const generateHash = () => Math.random().toString(36).slice(2, 8);

const listFilesRecursive = async (directory) => {
	const entries = await fs.readdir(directory, { withFileTypes: true });
	const paths = await Promise.all(
		entries.map(async (entry) => {
			const resolved = path.resolve(directory, entry.name);
			return entry.isDirectory() ? listFilesRecursive(resolved) : resolved;
		}),
	);
	return paths.flat().filter(file => ALLOWED_EXTENSIONS.has(path.extname(file)));
};

const rewriteFiles = async (filePaths, classNames) => {
	const classMap = new Map();
	classNames.sort((a, b) => b.length - a.length).forEach((name) => {
		classMap.set(name, `${name}-${generateHash()}`);
	});
	await Promise.all(
		filePaths.map(async (filePath) => {
			let content = await fs.readFile(filePath, 'utf8');
			const original = content;
			classMap.forEach((replacement, originalName) => {
				const selectorPattern = new RegExp(`(?<![-_\\w])\\.${originalName}(?![-_\\w])`, 'g');
				content = content.replace(selectorPattern, `.${replacement}`);
			});
			const classAttributePattern = /(class(?:Name)?\s*=\s*)(["'])(.*?)\2/g;
			content = content.replaceAll(classAttributePattern, (_whole, attribute, quote, value) => {
				const updated = String(value).split(/\s+/).map(cls => classMap.get(cls) || cls).join(' ');
				return `${attribute}${quote}${updated}${quote}`;
			});
			if (content !== original) { await fs.writeFile(filePath, content, 'utf8'); }
		}),
	);
};

const input = process.argv[2];
if (!input) { throw new Error('Input directory is required.'); }
const directory = path.resolve(input);
const stats = await fs.stat(directory).catch(() => null);
if (!stats?.isDirectory()) { throw new Error('Input must be a valid directory.'); }
const filePaths = await listFilesRecursive(directory);
await rewriteFiles(filePaths, TARGET_CLASSES);
