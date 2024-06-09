'use strict';

var node_url = require('node:url');
var esbuild = require('esbuild');
var crypto = require('node:crypto');
var fs = require('node:fs');
var path = require('node:path');
var os = require('node:os');
var temporaryDirectory = require('./temporary-directory-dlKDKQR6.cjs');

const sha1 = (data) => crypto.createHash("sha1").update(data).digest("hex");

const comma = ','.charCodeAt(0);
const semicolon = ';'.charCodeAt(0);
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const intToChar = new Uint8Array(64); // 64 possible chars.
const charToInt = new Uint8Array(128); // z is 122 in ASCII
for (let i = 0; i < chars.length; i++) {
    const c = chars.charCodeAt(i);
    intToChar[i] = c;
    charToInt[c] = i;
}
// Provide a fallback for older environments.
const td = typeof TextDecoder !== 'undefined'
    ? /* #__PURE__ */ new TextDecoder()
    : typeof Buffer !== 'undefined'
        ? {
            decode(buf) {
                const out = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
                return out.toString();
            },
        }
        : {
            decode(buf) {
                let out = '';
                for (let i = 0; i < buf.length; i++) {
                    out += String.fromCharCode(buf[i]);
                }
                return out;
            },
        };
function decode(mappings) {
    const state = new Int32Array(5);
    const decoded = [];
    let index = 0;
    do {
        const semi = indexOf(mappings, index);
        const line = [];
        let sorted = true;
        let lastCol = 0;
        state[0] = 0;
        for (let i = index; i < semi; i++) {
            let seg;
            i = decodeInteger(mappings, i, state, 0); // genColumn
            const col = state[0];
            if (col < lastCol)
                sorted = false;
            lastCol = col;
            if (hasMoreVlq(mappings, i, semi)) {
                i = decodeInteger(mappings, i, state, 1); // sourcesIndex
                i = decodeInteger(mappings, i, state, 2); // sourceLine
                i = decodeInteger(mappings, i, state, 3); // sourceColumn
                if (hasMoreVlq(mappings, i, semi)) {
                    i = decodeInteger(mappings, i, state, 4); // namesIndex
                    seg = [col, state[1], state[2], state[3], state[4]];
                }
                else {
                    seg = [col, state[1], state[2], state[3]];
                }
            }
            else {
                seg = [col];
            }
            line.push(seg);
        }
        if (!sorted)
            sort(line);
        decoded.push(line);
        index = semi + 1;
    } while (index <= mappings.length);
    return decoded;
}
function indexOf(mappings, index) {
    const idx = mappings.indexOf(';', index);
    return idx === -1 ? mappings.length : idx;
}
function decodeInteger(mappings, pos, state, j) {
    let value = 0;
    let shift = 0;
    let integer = 0;
    do {
        const c = mappings.charCodeAt(pos++);
        integer = charToInt[c];
        value |= (integer & 31) << shift;
        shift += 5;
    } while (integer & 32);
    const shouldNegate = value & 1;
    value >>>= 1;
    if (shouldNegate) {
        value = -0x80000000 | -value;
    }
    state[j] += value;
    return pos;
}
function hasMoreVlq(mappings, i, length) {
    if (i >= length)
        return false;
    return mappings.charCodeAt(i) !== comma;
}
function sort(line) {
    line.sort(sortComparator$1);
}
function sortComparator$1(a, b) {
    return a[0] - b[0];
}
function encode(decoded) {
    const state = new Int32Array(5);
    const bufLength = 1024 * 16;
    const subLength = bufLength - 36;
    const buf = new Uint8Array(bufLength);
    const sub = buf.subarray(0, subLength);
    let pos = 0;
    let out = '';
    for (let i = 0; i < decoded.length; i++) {
        const line = decoded[i];
        if (i > 0) {
            if (pos === bufLength) {
                out += td.decode(buf);
                pos = 0;
            }
            buf[pos++] = semicolon;
        }
        if (line.length === 0)
            continue;
        state[0] = 0;
        for (let j = 0; j < line.length; j++) {
            const segment = line[j];
            // We can push up to 5 ints, each int can take at most 7 chars, and we
            // may push a comma.
            if (pos > subLength) {
                out += td.decode(sub);
                buf.copyWithin(0, subLength, pos);
                pos -= subLength;
            }
            if (j > 0)
                buf[pos++] = comma;
            pos = encodeInteger(buf, pos, state, segment, 0); // genColumn
            if (segment.length === 1)
                continue;
            pos = encodeInteger(buf, pos, state, segment, 1); // sourcesIndex
            pos = encodeInteger(buf, pos, state, segment, 2); // sourceLine
            pos = encodeInteger(buf, pos, state, segment, 3); // sourceColumn
            if (segment.length === 4)
                continue;
            pos = encodeInteger(buf, pos, state, segment, 4); // namesIndex
        }
    }
    return out + td.decode(buf.subarray(0, pos));
}
function encodeInteger(buf, pos, state, segment, j) {
    const next = segment[j];
    let num = next - state[j];
    state[j] = next;
    num = num < 0 ? (-num << 1) | 1 : num << 1;
    do {
        let clamped = num & 0b011111;
        num >>>= 5;
        if (num > 0)
            clamped |= 0b100000;
        buf[pos++] = intToChar[clamped];
    } while (num > 0);
    return pos;
}

class BitSet {
	constructor(arg) {
		this.bits = arg instanceof BitSet ? arg.bits.slice() : [];
	}

	add(n) {
		this.bits[n >> 5] |= 1 << (n & 31);
	}

	has(n) {
		return !!(this.bits[n >> 5] & (1 << (n & 31)));
	}
}

class Chunk {
	constructor(start, end, content) {
		this.start = start;
		this.end = end;
		this.original = content;

		this.intro = '';
		this.outro = '';

		this.content = content;
		this.storeName = false;
		this.edited = false;

		{
			this.previous = null;
			this.next = null;
		}
	}

	appendLeft(content) {
		this.outro += content;
	}

	appendRight(content) {
		this.intro = this.intro + content;
	}

	clone() {
		const chunk = new Chunk(this.start, this.end, this.original);

		chunk.intro = this.intro;
		chunk.outro = this.outro;
		chunk.content = this.content;
		chunk.storeName = this.storeName;
		chunk.edited = this.edited;

		return chunk;
	}

	contains(index) {
		return this.start < index && index < this.end;
	}

	eachNext(fn) {
		let chunk = this;
		while (chunk) {
			fn(chunk);
			chunk = chunk.next;
		}
	}

	eachPrevious(fn) {
		let chunk = this;
		while (chunk) {
			fn(chunk);
			chunk = chunk.previous;
		}
	}

	edit(content, storeName, contentOnly) {
		this.content = content;
		if (!contentOnly) {
			this.intro = '';
			this.outro = '';
		}
		this.storeName = storeName;

		this.edited = true;

		return this;
	}

	prependLeft(content) {
		this.outro = content + this.outro;
	}

	prependRight(content) {
		this.intro = content + this.intro;
	}

	reset() {
		this.intro = '';
		this.outro = '';
		if (this.edited) {
			this.content = this.original;
			this.storeName = false;
			this.edited = false;
		}
	}

	split(index) {
		const sliceIndex = index - this.start;

		const originalBefore = this.original.slice(0, sliceIndex);
		const originalAfter = this.original.slice(sliceIndex);

		this.original = originalBefore;

		const newChunk = new Chunk(index, this.end, originalAfter);
		newChunk.outro = this.outro;
		this.outro = '';

		this.end = index;

		if (this.edited) {
			// after split we should save the edit content record into the correct chunk
			// to make sure sourcemap correct
			// For example:
			// '  test'.trim()
			//     split   -> '  ' + 'test'
			//   ✔️ edit    -> '' + 'test'
			//   ✖️ edit    -> 'test' + '' 
			// TODO is this block necessary?...
			newChunk.edit('', false);
			this.content = '';
		} else {
			this.content = originalBefore;
		}

		newChunk.next = this.next;
		if (newChunk.next) newChunk.next.previous = newChunk;
		newChunk.previous = this;
		this.next = newChunk;

		return newChunk;
	}

	toString() {
		return this.intro + this.content + this.outro;
	}

	trimEnd(rx) {
		this.outro = this.outro.replace(rx, '');
		if (this.outro.length) return true;

		const trimmed = this.content.replace(rx, '');

		if (trimmed.length) {
			if (trimmed !== this.content) {
				this.split(this.start + trimmed.length).edit('', undefined, true);
				if (this.edited) {
					// save the change, if it has been edited
					this.edit(trimmed, this.storeName, true);
				}
			}
			return true;
		} else {
			this.edit('', undefined, true);

			this.intro = this.intro.replace(rx, '');
			if (this.intro.length) return true;
		}
	}

	trimStart(rx) {
		this.intro = this.intro.replace(rx, '');
		if (this.intro.length) return true;

		const trimmed = this.content.replace(rx, '');

		if (trimmed.length) {
			if (trimmed !== this.content) {
				const newChunk = this.split(this.end - trimmed.length);
				if (this.edited) {
					// save the change, if it has been edited
					newChunk.edit(trimmed, this.storeName, true);
				}
				this.edit('', undefined, true);
			}
			return true;
		} else {
			this.edit('', undefined, true);

			this.outro = this.outro.replace(rx, '');
			if (this.outro.length) return true;
		}
	}
}

function getBtoa() {
	if (typeof globalThis !== 'undefined' && typeof globalThis.btoa === 'function') {
		return (str) => globalThis.btoa(unescape(encodeURIComponent(str)));
	} else if (typeof Buffer === 'function') {
		return (str) => Buffer.from(str, 'utf-8').toString('base64');
	} else {
		return () => {
			throw new Error('Unsupported environment: `window.btoa` or `Buffer` should be supported.');
		};
	}
}

const btoa = /*#__PURE__*/ getBtoa();

let SourceMap$1 = class SourceMap {
	constructor(properties) {
		this.version = 3;
		this.file = properties.file;
		this.sources = properties.sources;
		this.sourcesContent = properties.sourcesContent;
		this.names = properties.names;
		this.mappings = encode(properties.mappings);
		if (typeof properties.x_google_ignoreList !== 'undefined') {
			this.x_google_ignoreList = properties.x_google_ignoreList;
		}
	}

	toString() {
		return JSON.stringify(this);
	}

	toUrl() {
		return 'data:application/json;charset=utf-8;base64,' + btoa(this.toString());
	}
};

function guessIndent(code) {
	const lines = code.split('\n');

	const tabbed = lines.filter((line) => /^\t+/.test(line));
	const spaced = lines.filter((line) => /^ {2,}/.test(line));

	if (tabbed.length === 0 && spaced.length === 0) {
		return null;
	}

	// More lines tabbed than spaced? Assume tabs, and
	// default to tabs in the case of a tie (or nothing
	// to go on)
	if (tabbed.length >= spaced.length) {
		return '\t';
	}

	// Otherwise, we need to guess the multiple
	const min = spaced.reduce((previous, current) => {
		const numSpaces = /^ +/.exec(current)[0].length;
		return Math.min(numSpaces, previous);
	}, Infinity);

	return new Array(min + 1).join(' ');
}

function getRelativePath(from, to) {
	const fromParts = from.split(/[/\\]/);
	const toParts = to.split(/[/\\]/);

	fromParts.pop(); // get dirname

	while (fromParts[0] === toParts[0]) {
		fromParts.shift();
		toParts.shift();
	}

	if (fromParts.length) {
		let i = fromParts.length;
		while (i--) fromParts[i] = '..';
	}

	return fromParts.concat(toParts).join('/');
}

const toString = Object.prototype.toString;

function isObject(thing) {
	return toString.call(thing) === '[object Object]';
}

function getLocator(source) {
	const originalLines = source.split('\n');
	const lineOffsets = [];

	for (let i = 0, pos = 0; i < originalLines.length; i++) {
		lineOffsets.push(pos);
		pos += originalLines[i].length + 1;
	}

	return function locate(index) {
		let i = 0;
		let j = lineOffsets.length;
		while (i < j) {
			const m = (i + j) >> 1;
			if (index < lineOffsets[m]) {
				j = m;
			} else {
				i = m + 1;
			}
		}
		const line = i - 1;
		const column = index - lineOffsets[line];
		return { line, column };
	};
}

const wordRegex = /\w/;

class Mappings {
	constructor(hires) {
		this.hires = hires;
		this.generatedCodeLine = 0;
		this.generatedCodeColumn = 0;
		this.raw = [];
		this.rawSegments = this.raw[this.generatedCodeLine] = [];
		this.pending = null;
	}

	addEdit(sourceIndex, content, loc, nameIndex) {
		if (content.length) {
			const contentLengthMinusOne = content.length - 1;
			let contentLineEnd = content.indexOf('\n', 0);
			let previousContentLineEnd = -1;
			// Loop through each line in the content and add a segment, but stop if the last line is empty,
			// else code afterwards would fill one line too many
			while (contentLineEnd >= 0 && contentLengthMinusOne > contentLineEnd) {
				const segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
				if (nameIndex >= 0) {
					segment.push(nameIndex);
				}
				this.rawSegments.push(segment);

				this.generatedCodeLine += 1;
				this.raw[this.generatedCodeLine] = this.rawSegments = [];
				this.generatedCodeColumn = 0;

				previousContentLineEnd = contentLineEnd;
				contentLineEnd = content.indexOf('\n', contentLineEnd + 1);
			}

			const segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
			if (nameIndex >= 0) {
				segment.push(nameIndex);
			}
			this.rawSegments.push(segment);

			this.advance(content.slice(previousContentLineEnd + 1));
		} else if (this.pending) {
			this.rawSegments.push(this.pending);
			this.advance(content);
		}

		this.pending = null;
	}

	addUneditedChunk(sourceIndex, chunk, original, loc, sourcemapLocations) {
		let originalCharIndex = chunk.start;
		let first = true;
		// when iterating each char, check if it's in a word boundary
		let charInHiresBoundary = false;

		while (originalCharIndex < chunk.end) {
			if (this.hires || first || sourcemapLocations.has(originalCharIndex)) {
				const segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];

				if (this.hires === 'boundary') {
					// in hires "boundary", group segments per word boundary than per char
					if (wordRegex.test(original[originalCharIndex])) {
						// for first char in the boundary found, start the boundary by pushing a segment
						if (!charInHiresBoundary) {
							this.rawSegments.push(segment);
							charInHiresBoundary = true;
						}
					} else {
						// for non-word char, end the boundary by pushing a segment
						this.rawSegments.push(segment);
						charInHiresBoundary = false;
					}
				} else {
					this.rawSegments.push(segment);
				}
			}

			if (original[originalCharIndex] === '\n') {
				loc.line += 1;
				loc.column = 0;
				this.generatedCodeLine += 1;
				this.raw[this.generatedCodeLine] = this.rawSegments = [];
				this.generatedCodeColumn = 0;
				first = true;
			} else {
				loc.column += 1;
				this.generatedCodeColumn += 1;
				first = false;
			}

			originalCharIndex += 1;
		}

		this.pending = null;
	}

	advance(str) {
		if (!str) return;

		const lines = str.split('\n');

		if (lines.length > 1) {
			for (let i = 0; i < lines.length - 1; i++) {
				this.generatedCodeLine++;
				this.raw[this.generatedCodeLine] = this.rawSegments = [];
			}
			this.generatedCodeColumn = 0;
		}

		this.generatedCodeColumn += lines[lines.length - 1].length;
	}
}

const n$1 = '\n';

const warned = {
	insertLeft: false,
	insertRight: false,
	storeName: false,
};

class MagicString {
	constructor(string, options = {}) {
		const chunk = new Chunk(0, string.length, string);

		Object.defineProperties(this, {
			original: { writable: true, value: string },
			outro: { writable: true, value: '' },
			intro: { writable: true, value: '' },
			firstChunk: { writable: true, value: chunk },
			lastChunk: { writable: true, value: chunk },
			lastSearchedChunk: { writable: true, value: chunk },
			byStart: { writable: true, value: {} },
			byEnd: { writable: true, value: {} },
			filename: { writable: true, value: options.filename },
			indentExclusionRanges: { writable: true, value: options.indentExclusionRanges },
			sourcemapLocations: { writable: true, value: new BitSet() },
			storedNames: { writable: true, value: {} },
			indentStr: { writable: true, value: undefined },
			ignoreList: { writable: true, value: options.ignoreList },
		});

		this.byStart[0] = chunk;
		this.byEnd[string.length] = chunk;
	}

	addSourcemapLocation(char) {
		this.sourcemapLocations.add(char);
	}

	append(content) {
		if (typeof content !== 'string') throw new TypeError('outro content must be a string');

		this.outro += content;
		return this;
	}

	appendLeft(index, content) {
		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byEnd[index];

		if (chunk) {
			chunk.appendLeft(content);
		} else {
			this.intro += content;
		}
		return this;
	}

	appendRight(index, content) {
		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byStart[index];

		if (chunk) {
			chunk.appendRight(content);
		} else {
			this.outro += content;
		}
		return this;
	}

	clone() {
		const cloned = new MagicString(this.original, { filename: this.filename });

		let originalChunk = this.firstChunk;
		let clonedChunk = (cloned.firstChunk = cloned.lastSearchedChunk = originalChunk.clone());

		while (originalChunk) {
			cloned.byStart[clonedChunk.start] = clonedChunk;
			cloned.byEnd[clonedChunk.end] = clonedChunk;

			const nextOriginalChunk = originalChunk.next;
			const nextClonedChunk = nextOriginalChunk && nextOriginalChunk.clone();

			if (nextClonedChunk) {
				clonedChunk.next = nextClonedChunk;
				nextClonedChunk.previous = clonedChunk;

				clonedChunk = nextClonedChunk;
			}

			originalChunk = nextOriginalChunk;
		}

		cloned.lastChunk = clonedChunk;

		if (this.indentExclusionRanges) {
			cloned.indentExclusionRanges = this.indentExclusionRanges.slice();
		}

		cloned.sourcemapLocations = new BitSet(this.sourcemapLocations);

		cloned.intro = this.intro;
		cloned.outro = this.outro;

		return cloned;
	}

	generateDecodedMap(options) {
		options = options || {};

		const sourceIndex = 0;
		const names = Object.keys(this.storedNames);
		const mappings = new Mappings(options.hires);

		const locate = getLocator(this.original);

		if (this.intro) {
			mappings.advance(this.intro);
		}

		this.firstChunk.eachNext((chunk) => {
			const loc = locate(chunk.start);

			if (chunk.intro.length) mappings.advance(chunk.intro);

			if (chunk.edited) {
				mappings.addEdit(
					sourceIndex,
					chunk.content,
					loc,
					chunk.storeName ? names.indexOf(chunk.original) : -1,
				);
			} else {
				mappings.addUneditedChunk(sourceIndex, chunk, this.original, loc, this.sourcemapLocations);
			}

			if (chunk.outro.length) mappings.advance(chunk.outro);
		});

		return {
			file: options.file ? options.file.split(/[/\\]/).pop() : undefined,
			sources: [
				options.source ? getRelativePath(options.file || '', options.source) : options.file || '',
			],
			sourcesContent: options.includeContent ? [this.original] : undefined,
			names,
			mappings: mappings.raw,
			x_google_ignoreList: this.ignoreList ? [sourceIndex] : undefined,
		};
	}

	generateMap(options) {
		return new SourceMap$1(this.generateDecodedMap(options));
	}

	_ensureindentStr() {
		if (this.indentStr === undefined) {
			this.indentStr = guessIndent(this.original);
		}
	}

	_getRawIndentString() {
		this._ensureindentStr();
		return this.indentStr;
	}

	getIndentString() {
		this._ensureindentStr();
		return this.indentStr === null ? '\t' : this.indentStr;
	}

	indent(indentStr, options) {
		const pattern = /^[^\r\n]/gm;

		if (isObject(indentStr)) {
			options = indentStr;
			indentStr = undefined;
		}

		if (indentStr === undefined) {
			this._ensureindentStr();
			indentStr = this.indentStr || '\t';
		}

		if (indentStr === '') return this; // noop

		options = options || {};

		// Process exclusion ranges
		const isExcluded = {};

		if (options.exclude) {
			const exclusions =
				typeof options.exclude[0] === 'number' ? [options.exclude] : options.exclude;
			exclusions.forEach((exclusion) => {
				for (let i = exclusion[0]; i < exclusion[1]; i += 1) {
					isExcluded[i] = true;
				}
			});
		}

		let shouldIndentNextCharacter = options.indentStart !== false;
		const replacer = (match) => {
			if (shouldIndentNextCharacter) return `${indentStr}${match}`;
			shouldIndentNextCharacter = true;
			return match;
		};

		this.intro = this.intro.replace(pattern, replacer);

		let charIndex = 0;
		let chunk = this.firstChunk;

		while (chunk) {
			const end = chunk.end;

			if (chunk.edited) {
				if (!isExcluded[charIndex]) {
					chunk.content = chunk.content.replace(pattern, replacer);

					if (chunk.content.length) {
						shouldIndentNextCharacter = chunk.content[chunk.content.length - 1] === '\n';
					}
				}
			} else {
				charIndex = chunk.start;

				while (charIndex < end) {
					if (!isExcluded[charIndex]) {
						const char = this.original[charIndex];

						if (char === '\n') {
							shouldIndentNextCharacter = true;
						} else if (char !== '\r' && shouldIndentNextCharacter) {
							shouldIndentNextCharacter = false;

							if (charIndex === chunk.start) {
								chunk.prependRight(indentStr);
							} else {
								this._splitChunk(chunk, charIndex);
								chunk = chunk.next;
								chunk.prependRight(indentStr);
							}
						}
					}

					charIndex += 1;
				}
			}

			charIndex = chunk.end;
			chunk = chunk.next;
		}

		this.outro = this.outro.replace(pattern, replacer);

		return this;
	}

	insert() {
		throw new Error(
			'magicString.insert(...) is deprecated. Use prependRight(...) or appendLeft(...)',
		);
	}

	insertLeft(index, content) {
		if (!warned.insertLeft) {
			console.warn(
				'magicString.insertLeft(...) is deprecated. Use magicString.appendLeft(...) instead',
			); // eslint-disable-line no-console
			warned.insertLeft = true;
		}

		return this.appendLeft(index, content);
	}

	insertRight(index, content) {
		if (!warned.insertRight) {
			console.warn(
				'magicString.insertRight(...) is deprecated. Use magicString.prependRight(...) instead',
			); // eslint-disable-line no-console
			warned.insertRight = true;
		}

		return this.prependRight(index, content);
	}

	move(start, end, index) {
		if (index >= start && index <= end) throw new Error('Cannot move a selection inside itself');

		this._split(start);
		this._split(end);
		this._split(index);

		const first = this.byStart[start];
		const last = this.byEnd[end];

		const oldLeft = first.previous;
		const oldRight = last.next;

		const newRight = this.byStart[index];
		if (!newRight && last === this.lastChunk) return this;
		const newLeft = newRight ? newRight.previous : this.lastChunk;

		if (oldLeft) oldLeft.next = oldRight;
		if (oldRight) oldRight.previous = oldLeft;

		if (newLeft) newLeft.next = first;
		if (newRight) newRight.previous = last;

		if (!first.previous) this.firstChunk = last.next;
		if (!last.next) {
			this.lastChunk = first.previous;
			this.lastChunk.next = null;
		}

		first.previous = newLeft;
		last.next = newRight || null;

		if (!newLeft) this.firstChunk = first;
		if (!newRight) this.lastChunk = last;
		return this;
	}

	overwrite(start, end, content, options) {
		options = options || {};
		return this.update(start, end, content, { ...options, overwrite: !options.contentOnly });
	}

	update(start, end, content, options) {
		if (typeof content !== 'string') throw new TypeError('replacement content must be a string');

		while (start < 0) start += this.original.length;
		while (end < 0) end += this.original.length;

		if (end > this.original.length) throw new Error('end is out of bounds');
		if (start === end)
			throw new Error(
				'Cannot overwrite a zero-length range – use appendLeft or prependRight instead',
			);

		this._split(start);
		this._split(end);

		if (options === true) {
			if (!warned.storeName) {
				console.warn(
					'The final argument to magicString.overwrite(...) should be an options object. See https://github.com/rich-harris/magic-string',
				); // eslint-disable-line no-console
				warned.storeName = true;
			}

			options = { storeName: true };
		}
		const storeName = options !== undefined ? options.storeName : false;
		const overwrite = options !== undefined ? options.overwrite : false;

		if (storeName) {
			const original = this.original.slice(start, end);
			Object.defineProperty(this.storedNames, original, {
				writable: true,
				value: true,
				enumerable: true,
			});
		}

		const first = this.byStart[start];
		const last = this.byEnd[end];

		if (first) {
			let chunk = first;
			while (chunk !== last) {
				if (chunk.next !== this.byStart[chunk.end]) {
					throw new Error('Cannot overwrite across a split point');
				}
				chunk = chunk.next;
				chunk.edit('', false);
			}

			first.edit(content, storeName, !overwrite);
		} else {
			// must be inserting at the end
			const newChunk = new Chunk(start, end, '').edit(content, storeName);

			// TODO last chunk in the array may not be the last chunk, if it's moved...
			last.next = newChunk;
			newChunk.previous = last;
		}
		return this;
	}

	prepend(content) {
		if (typeof content !== 'string') throw new TypeError('outro content must be a string');

		this.intro = content + this.intro;
		return this;
	}

	prependLeft(index, content) {
		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byEnd[index];

		if (chunk) {
			chunk.prependLeft(content);
		} else {
			this.intro = content + this.intro;
		}
		return this;
	}

	prependRight(index, content) {
		if (typeof content !== 'string') throw new TypeError('inserted content must be a string');

		this._split(index);

		const chunk = this.byStart[index];

		if (chunk) {
			chunk.prependRight(content);
		} else {
			this.outro = content + this.outro;
		}
		return this;
	}

	remove(start, end) {
		while (start < 0) start += this.original.length;
		while (end < 0) end += this.original.length;

		if (start === end) return this;

		if (start < 0 || end > this.original.length) throw new Error('Character is out of bounds');
		if (start > end) throw new Error('end must be greater than start');

		this._split(start);
		this._split(end);

		let chunk = this.byStart[start];

		while (chunk) {
			chunk.intro = '';
			chunk.outro = '';
			chunk.edit('');

			chunk = end > chunk.end ? this.byStart[chunk.end] : null;
		}
		return this;
	}

	reset(start, end) {
		while (start < 0) start += this.original.length;
		while (end < 0) end += this.original.length;

		if (start === end) return this;

		if (start < 0 || end > this.original.length) throw new Error('Character is out of bounds');
		if (start > end) throw new Error('end must be greater than start');

		this._split(start);
		this._split(end);

		let chunk = this.byStart[start];

		while (chunk) {
			chunk.reset();

			chunk = end > chunk.end ? this.byStart[chunk.end] : null;
		}
		return this;
	}

	lastChar() {
		if (this.outro.length) return this.outro[this.outro.length - 1];
		let chunk = this.lastChunk;
		do {
			if (chunk.outro.length) return chunk.outro[chunk.outro.length - 1];
			if (chunk.content.length) return chunk.content[chunk.content.length - 1];
			if (chunk.intro.length) return chunk.intro[chunk.intro.length - 1];
		} while ((chunk = chunk.previous));
		if (this.intro.length) return this.intro[this.intro.length - 1];
		return '';
	}

	lastLine() {
		let lineIndex = this.outro.lastIndexOf(n$1);
		if (lineIndex !== -1) return this.outro.substr(lineIndex + 1);
		let lineStr = this.outro;
		let chunk = this.lastChunk;
		do {
			if (chunk.outro.length > 0) {
				lineIndex = chunk.outro.lastIndexOf(n$1);
				if (lineIndex !== -1) return chunk.outro.substr(lineIndex + 1) + lineStr;
				lineStr = chunk.outro + lineStr;
			}

			if (chunk.content.length > 0) {
				lineIndex = chunk.content.lastIndexOf(n$1);
				if (lineIndex !== -1) return chunk.content.substr(lineIndex + 1) + lineStr;
				lineStr = chunk.content + lineStr;
			}

			if (chunk.intro.length > 0) {
				lineIndex = chunk.intro.lastIndexOf(n$1);
				if (lineIndex !== -1) return chunk.intro.substr(lineIndex + 1) + lineStr;
				lineStr = chunk.intro + lineStr;
			}
		} while ((chunk = chunk.previous));
		lineIndex = this.intro.lastIndexOf(n$1);
		if (lineIndex !== -1) return this.intro.substr(lineIndex + 1) + lineStr;
		return this.intro + lineStr;
	}

	slice(start = 0, end = this.original.length) {
		while (start < 0) start += this.original.length;
		while (end < 0) end += this.original.length;

		let result = '';

		// find start chunk
		let chunk = this.firstChunk;
		while (chunk && (chunk.start > start || chunk.end <= start)) {
			// found end chunk before start
			if (chunk.start < end && chunk.end >= end) {
				return result;
			}

			chunk = chunk.next;
		}

		if (chunk && chunk.edited && chunk.start !== start)
			throw new Error(`Cannot use replaced character ${start} as slice start anchor.`);

		const startChunk = chunk;
		while (chunk) {
			if (chunk.intro && (startChunk !== chunk || chunk.start === start)) {
				result += chunk.intro;
			}

			const containsEnd = chunk.start < end && chunk.end >= end;
			if (containsEnd && chunk.edited && chunk.end !== end)
				throw new Error(`Cannot use replaced character ${end} as slice end anchor.`);

			const sliceStart = startChunk === chunk ? start - chunk.start : 0;
			const sliceEnd = containsEnd ? chunk.content.length + end - chunk.end : chunk.content.length;

			result += chunk.content.slice(sliceStart, sliceEnd);

			if (chunk.outro && (!containsEnd || chunk.end === end)) {
				result += chunk.outro;
			}

			if (containsEnd) {
				break;
			}

			chunk = chunk.next;
		}

		return result;
	}

	// TODO deprecate this? not really very useful
	snip(start, end) {
		const clone = this.clone();
		clone.remove(0, start);
		clone.remove(end, clone.original.length);

		return clone;
	}

	_split(index) {
		if (this.byStart[index] || this.byEnd[index]) return;

		let chunk = this.lastSearchedChunk;
		const searchForward = index > chunk.end;

		while (chunk) {
			if (chunk.contains(index)) return this._splitChunk(chunk, index);

			chunk = searchForward ? this.byStart[chunk.end] : this.byEnd[chunk.start];
		}
	}

	_splitChunk(chunk, index) {
		if (chunk.edited && chunk.content.length) {
			// zero-length edited chunks are a special case (overlapping replacements)
			const loc = getLocator(this.original)(index);
			throw new Error(
				`Cannot split a chunk that has already been edited (${loc.line}:${loc.column} – "${chunk.original}")`,
			);
		}

		const newChunk = chunk.split(index);

		this.byEnd[index] = chunk;
		this.byStart[index] = newChunk;
		this.byEnd[newChunk.end] = newChunk;

		if (chunk === this.lastChunk) this.lastChunk = newChunk;

		this.lastSearchedChunk = chunk;
		return true;
	}

	toString() {
		let str = this.intro;

		let chunk = this.firstChunk;
		while (chunk) {
			str += chunk.toString();
			chunk = chunk.next;
		}

		return str + this.outro;
	}

	isEmpty() {
		let chunk = this.firstChunk;
		do {
			if (
				(chunk.intro.length && chunk.intro.trim()) ||
				(chunk.content.length && chunk.content.trim()) ||
				(chunk.outro.length && chunk.outro.trim())
			)
				return false;
		} while ((chunk = chunk.next));
		return true;
	}

	length() {
		let chunk = this.firstChunk;
		let length = 0;
		do {
			length += chunk.intro.length + chunk.content.length + chunk.outro.length;
		} while ((chunk = chunk.next));
		return length;
	}

	trimLines() {
		return this.trim('[\\r\\n]');
	}

	trim(charType) {
		return this.trimStart(charType).trimEnd(charType);
	}

	trimEndAborted(charType) {
		const rx = new RegExp((charType || '\\s') + '+$');

		this.outro = this.outro.replace(rx, '');
		if (this.outro.length) return true;

		let chunk = this.lastChunk;

		do {
			const end = chunk.end;
			const aborted = chunk.trimEnd(rx);

			// if chunk was trimmed, we have a new lastChunk
			if (chunk.end !== end) {
				if (this.lastChunk === chunk) {
					this.lastChunk = chunk.next;
				}

				this.byEnd[chunk.end] = chunk;
				this.byStart[chunk.next.start] = chunk.next;
				this.byEnd[chunk.next.end] = chunk.next;
			}

			if (aborted) return true;
			chunk = chunk.previous;
		} while (chunk);

		return false;
	}

	trimEnd(charType) {
		this.trimEndAborted(charType);
		return this;
	}
	trimStartAborted(charType) {
		const rx = new RegExp('^' + (charType || '\\s') + '+');

		this.intro = this.intro.replace(rx, '');
		if (this.intro.length) return true;

		let chunk = this.firstChunk;

		do {
			const end = chunk.end;
			const aborted = chunk.trimStart(rx);

			if (chunk.end !== end) {
				// special case...
				if (chunk === this.lastChunk) this.lastChunk = chunk.next;

				this.byEnd[chunk.end] = chunk;
				this.byStart[chunk.next.start] = chunk.next;
				this.byEnd[chunk.next.end] = chunk.next;
			}

			if (aborted) return true;
			chunk = chunk.next;
		} while (chunk);

		return false;
	}

	trimStart(charType) {
		this.trimStartAborted(charType);
		return this;
	}

	hasChanged() {
		return this.original !== this.toString();
	}

	_replaceRegexp(searchValue, replacement) {
		function getReplacement(match, str) {
			if (typeof replacement === 'string') {
				return replacement.replace(/\$(\$|&|\d+)/g, (_, i) => {
					// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#specifying_a_string_as_a_parameter
					if (i === '$') return '$';
					if (i === '&') return match[0];
					const num = +i;
					if (num < match.length) return match[+i];
					return `$${i}`;
				});
			} else {
				return replacement(...match, match.index, str, match.groups);
			}
		}
		function matchAll(re, str) {
			let match;
			const matches = [];
			while ((match = re.exec(str))) {
				matches.push(match);
			}
			return matches;
		}
		if (searchValue.global) {
			const matches = matchAll(searchValue, this.original);
			matches.forEach((match) => {
				if (match.index != null) {
					const replacement = getReplacement(match, this.original);
					if (replacement !== match[0]) {
						this.overwrite(
							match.index,
							match.index + match[0].length,
							replacement
						);
					}
				}
			});
		} else {
			const match = this.original.match(searchValue);
			if (match && match.index != null) {
				const replacement = getReplacement(match, this.original);
				if (replacement !== match[0]) {
					this.overwrite(
						match.index,
						match.index + match[0].length,
						replacement
					);
				}
			}
		}
		return this;
	}

	_replaceString(string, replacement) {
		const { original } = this;
		const index = original.indexOf(string);

		if (index !== -1) {
			this.overwrite(index, index + string.length, replacement);
		}

		return this;
	}

	replace(searchValue, replacement) {
		if (typeof searchValue === 'string') {
			return this._replaceString(searchValue, replacement);
		}

		return this._replaceRegexp(searchValue, replacement);
	}

	_replaceAllString(string, replacement) {
		const { original } = this;
		const stringLength = string.length;
		for (
			let index = original.indexOf(string);
			index !== -1;
			index = original.indexOf(string, index + stringLength)
		) {
			const previous = original.slice(index, index + stringLength);
			if (previous !== replacement)
				this.overwrite(index, index + stringLength, replacement);
		}

		return this;
	}

	replaceAll(searchValue, replacement) {
		if (typeof searchValue === 'string') {
			return this._replaceAllString(searchValue, replacement);
		}

		if (!searchValue.global) {
			throw new TypeError(
				'MagicString.prototype.replaceAll called with a non-global RegExp argument',
			);
		}

		return this._replaceRegexp(searchValue, replacement);
	}
}

/* es-module-lexer 1.5.3 */
var ImportType;!function(A){A[A.Static=1]="Static",A[A.Dynamic=2]="Dynamic",A[A.ImportMeta=3]="ImportMeta",A[A.StaticSourcePhase=4]="StaticSourcePhase",A[A.DynamicSourcePhase=5]="DynamicSourcePhase";}(ImportType||(ImportType={}));const A=1===new Uint8Array(new Uint16Array([1]).buffer)[0];function parse$1(E,g="@"){if(!C)return init.then((()=>parse$1(E)));const I=E.length+1,w=(C.__heap_base.value||C.__heap_base)+4*I-C.memory.buffer.byteLength;w>0&&C.memory.grow(Math.ceil(w/65536));const o=C.sa(I-1);if((A?B:Q)(E,new Uint16Array(C.memory.buffer,o,I)),!C.parse())throw Object.assign(new Error(`Parse error ${g}:${E.slice(0,C.e()).split("\n").length}:${C.e()-E.lastIndexOf("\n",C.e()-1)}`),{idx:C.e()});const D=[],K=[];for(;C.ri();){const A=C.is(),Q=C.ie(),B=C.it(),g=C.ai(),I=C.id(),w=C.ss(),o=C.se();let K;C.ip()&&(K=k(E.slice(-1===I?A-1:A,-1===I?Q+1:Q))),D.push({n:K,t:B,s:A,e:Q,ss:w,se:o,d:I,a:g});}for(;C.re();){const A=C.es(),Q=C.ee(),B=C.els(),g=C.ele(),I=E.slice(A,Q),w=I[0],o=B<0?void 0:E.slice(B,g),D=o?o[0]:"";K.push({s:A,e:Q,ls:B,le:g,n:'"'===w||"'"===w?k(I):I,ln:'"'===D||"'"===D?k(o):o});}function k(A){try{return (0,eval)(A)}catch(A){}}return [D,K,!!C.f(),!!C.ms()]}function Q(A,Q){const B=A.length;let C=0;for(;C<B;){const B=A.charCodeAt(C);Q[C++]=(255&B)<<8|B>>>8;}}function B(A,Q){const B=A.length;let C=0;for(;C<B;)Q[C]=A.charCodeAt(C++);}let C;const init=WebAssembly.compile((E="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","undefined"!=typeof Buffer?Buffer.from(E,"base64"):Uint8Array.from(atob(E),(A=>A.charCodeAt(0))))).then(WebAssembly.instantiate).then((({exports:A})=>{C=A;}));var E;

/* es-module-lexer 1.5.3 */
let e,a,r,i=2<<19;const s=1===new Uint8Array(new Uint16Array([1]).buffer)[0]?function(e,a){const r=e.length;let i=0;for(;i<r;)a[i]=e.charCodeAt(i++);}:function(e,a){const r=e.length;let i=0;for(;i<r;){const r=e.charCodeAt(i);a[i++]=(255&r)<<8|r>>>8;}},f="xportmportlassetaourceromsyncunctionssertvoyiedelecontininstantybreareturdebuggeawaithrwhileforifcatcfinallels";let t,c,n;function parse(k,l="@"){t=k,c=l;const u=2*t.length+(2<<18);if(u>i||!e){for(;u>i;)i*=2;a=new ArrayBuffer(i),s(f,new Uint16Array(a,16,110)),e=function(e,a,r){"use asm";var i=new e.Int8Array(r),s=new e.Int16Array(r),f=new e.Int32Array(r),t=new e.Uint8Array(r),c=new e.Uint16Array(r),n=1040;function b(){var e=0,a=0,r=0,t=0,c=0,b=0,u=0;u=n;n=n+10240|0;i[804]=1;i[803]=0;s[399]=0;s[400]=0;f[69]=f[2];i[805]=0;f[68]=0;i[802]=0;f[70]=u+2048;f[71]=u;i[806]=0;e=(f[3]|0)+-2|0;f[72]=e;a=e+(f[66]<<1)|0;f[73]=a;e:while(1){r=e+2|0;f[72]=r;if(e>>>0>=a>>>0){t=18;break}a:do{switch(s[r>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if((((s[400]|0)==0?H(r)|0:0)?(m(e+4|0,16,10)|0)==0:0)?(k(),(i[804]|0)==0):0){t=9;break e}else t=17;break}case 105:{if(H(r)|0?(m(e+4|0,26,10)|0)==0:0){l();t=17;}else t=17;break}case 59:{t=17;break}case 47:switch(s[e+4>>1]|0){case 47:{P();break a}case 42:{y(1);break a}default:{t=16;break e}}default:{t=16;break e}}}while(0);if((t|0)==17){t=0;f[69]=f[72];}e=f[72]|0;a=f[73]|0;}if((t|0)==9){e=f[72]|0;f[69]=e;t=19;}else if((t|0)==16){i[804]=0;f[72]=e;t=19;}else if((t|0)==18)if(!(i[802]|0)){e=r;t=19;}else e=0;do{if((t|0)==19){e:while(1){a=e+2|0;f[72]=a;if(e>>>0>=(f[73]|0)>>>0){t=92;break}a:do{switch(s[a>>1]|0){case 9:case 10:case 11:case 12:case 13:case 32:break;case 101:{if(((s[400]|0)==0?H(a)|0:0)?(m(e+4|0,16,10)|0)==0:0){k();t=91;}else t=91;break}case 105:{if(H(a)|0?(m(e+4|0,26,10)|0)==0:0){l();t=91;}else t=91;break}case 99:{if((H(a)|0?(m(e+4|0,36,8)|0)==0:0)?V(s[e+12>>1]|0)|0:0){i[806]=1;t=91;}else t=91;break}case 40:{r=f[70]|0;e=s[400]|0;t=e&65535;f[r+(t<<3)>>2]=1;a=f[69]|0;s[400]=e+1<<16>>16;f[r+(t<<3)+4>>2]=a;t=91;break}case 41:{a=s[400]|0;if(!(a<<16>>16)){t=36;break e}r=a+-1<<16>>16;s[400]=r;t=s[399]|0;a=t&65535;if(t<<16>>16!=0?(f[(f[70]|0)+((r&65535)<<3)>>2]|0)==5:0){a=f[(f[71]|0)+(a+-1<<2)>>2]|0;r=a+4|0;if(!(f[r>>2]|0))f[r>>2]=(f[69]|0)+2;f[a+12>>2]=e+4;s[399]=t+-1<<16>>16;t=91;}else t=91;break}case 123:{t=f[69]|0;r=f[63]|0;e=t;do{if((s[t>>1]|0)==41&(r|0)!=0?(f[r+4>>2]|0)==(t|0):0){a=f[64]|0;f[63]=a;if(!a){f[59]=0;break}else {f[a+32>>2]=0;break}}}while(0);r=f[70]|0;a=s[400]|0;t=a&65535;f[r+(t<<3)>>2]=(i[806]|0)==0?2:6;s[400]=a+1<<16>>16;f[r+(t<<3)+4>>2]=e;i[806]=0;t=91;break}case 125:{e=s[400]|0;if(!(e<<16>>16)){t=49;break e}r=f[70]|0;t=e+-1<<16>>16;s[400]=t;if((f[r+((t&65535)<<3)>>2]|0)==4){h();t=91;}else t=91;break}case 39:{v(39);t=91;break}case 34:{v(34);t=91;break}case 47:switch(s[e+4>>1]|0){case 47:{P();break a}case 42:{y(1);break a}default:{e=f[69]|0;a=s[e>>1]|0;r:do{if(!(U(a)|0))if(a<<16>>16==41){r=s[400]|0;if(!(D(f[(f[70]|0)+((r&65535)<<3)+4>>2]|0)|0))t=65;}else t=64;else switch(a<<16>>16){case 46:if(((s[e+-2>>1]|0)+-48&65535)<10){t=64;break r}else break r;case 43:if((s[e+-2>>1]|0)==43){t=64;break r}else break r;case 45:if((s[e+-2>>1]|0)==45){t=64;break r}else break r;default:break r}}while(0);if((t|0)==64){r=s[400]|0;t=65;}r:do{if((t|0)==65){t=0;if(r<<16>>16!=0?(c=f[70]|0,b=(r&65535)+-1|0,a<<16>>16==102?(f[c+(b<<3)>>2]|0)==1:0):0){if((s[e+-2>>1]|0)==111?D(f[c+(b<<3)+4>>2]|0)|0:0)break}else t=69;if((t|0)==69?(0,a<<16>>16==125):0){t=f[70]|0;r=r&65535;if(p(f[t+(r<<3)+4>>2]|0)|0)break;if((f[t+(r<<3)>>2]|0)==6)break}if(!(o(e)|0)){switch(a<<16>>16){case 0:break r;case 47:{if(i[805]|0)break r;break}default:{}}t=f[65]|0;if((t|0?e>>>0>=(f[t>>2]|0)>>>0:0)?e>>>0<=(f[t+4>>2]|0)>>>0:0){g();i[805]=0;t=91;break a}r=f[3]|0;do{if(e>>>0<=r>>>0)break;e=e+-2|0;f[69]=e;a=s[e>>1]|0;}while(!(E(a)|0));if(F(a)|0){do{if(e>>>0<=r>>>0)break;e=e+-2|0;f[69]=e;}while(F(s[e>>1]|0)|0);if(j(e)|0){g();i[805]=0;t=91;break a}}i[805]=1;t=91;break a}}}while(0);g();i[805]=0;t=91;break a}}case 96:{r=f[70]|0;a=s[400]|0;t=a&65535;f[r+(t<<3)+4>>2]=f[69];s[400]=a+1<<16>>16;f[r+(t<<3)>>2]=3;h();t=91;break}default:t=91;}}while(0);if((t|0)==91){t=0;f[69]=f[72];}e=f[72]|0;}if((t|0)==36){T();e=0;break}else if((t|0)==49){T();e=0;break}else if((t|0)==92){e=(i[802]|0)==0?(s[399]|s[400])<<16>>16==0:0;break}}}while(0);n=u;return e|0}function k(){var e=0,a=0,r=0,t=0,c=0,n=0,b=0,k=0,l=0,o=0,h=0,d=0,C=0,g=0;k=f[72]|0;l=f[65]|0;g=k+12|0;f[72]=g;r=w(1)|0;e=f[72]|0;if(!((e|0)==(g|0)?!(I(r)|0):0))C=3;e:do{if((C|0)==3){a:do{switch(r<<16>>16){case 123:{f[72]=e+2;e=w(1)|0;a=f[72]|0;while(1){if(W(e)|0){v(e);e=(f[72]|0)+2|0;f[72]=e;}else {q(e)|0;e=f[72]|0;}w(1)|0;e=A(a,e)|0;if(e<<16>>16==44){f[72]=(f[72]|0)+2;e=w(1)|0;}if(e<<16>>16==125){C=15;break}g=a;a=f[72]|0;if((a|0)==(g|0)){C=12;break}if(a>>>0>(f[73]|0)>>>0){C=14;break}}if((C|0)==12){T();break e}else if((C|0)==14){T();break e}else if((C|0)==15){i[803]=1;f[72]=(f[72]|0)+2;break a}break}case 42:{f[72]=e+2;w(1)|0;g=f[72]|0;A(g,g)|0;break}default:{i[804]=0;switch(r<<16>>16){case 100:{k=e+14|0;f[72]=k;switch((w(1)|0)<<16>>16){case 97:{a=f[72]|0;if((m(a+2|0,66,8)|0)==0?(c=a+10|0,F(s[c>>1]|0)|0):0){f[72]=c;w(0)|0;C=22;}break}case 102:{C=22;break}case 99:{a=f[72]|0;if(((m(a+2|0,36,8)|0)==0?(t=a+10|0,g=s[t>>1]|0,V(g)|0|g<<16>>16==123):0)?(f[72]=t,n=w(1)|0,n<<16>>16!=123):0){d=n;C=31;}break}default:{}}r:do{if((C|0)==22?(b=f[72]|0,(m(b+2|0,74,14)|0)==0):0){r=b+16|0;a=s[r>>1]|0;if(!(V(a)|0))switch(a<<16>>16){case 40:case 42:break;default:break r}f[72]=r;a=w(1)|0;if(a<<16>>16==42){f[72]=(f[72]|0)+2;a=w(1)|0;}if(a<<16>>16!=40){d=a;C=31;}}}while(0);if((C|0)==31?(o=f[72]|0,q(d)|0,h=f[72]|0,h>>>0>o>>>0):0){O(e,k,o,h);f[72]=(f[72]|0)+-2;break e}O(e,k,0,0);f[72]=e+12;break e}case 97:{f[72]=e+10;w(0)|0;e=f[72]|0;C=35;break}case 102:{C=35;break}case 99:{if((m(e+2|0,36,8)|0)==0?(a=e+10|0,E(s[a>>1]|0)|0):0){f[72]=a;g=w(1)|0;C=f[72]|0;q(g)|0;g=f[72]|0;O(C,g,C,g);f[72]=(f[72]|0)+-2;break e}e=e+4|0;f[72]=e;break}case 108:case 118:break;default:break e}if((C|0)==35){f[72]=e+16;e=w(1)|0;if(e<<16>>16==42){f[72]=(f[72]|0)+2;e=w(1)|0;}C=f[72]|0;q(e)|0;g=f[72]|0;O(C,g,C,g);f[72]=(f[72]|0)+-2;break e}f[72]=e+6;i[804]=0;r=w(1)|0;e=f[72]|0;r=(q(r)|0|32)<<16>>16==123;t=f[72]|0;if(r){f[72]=t+2;g=w(1)|0;e=f[72]|0;q(g)|0;}r:while(1){a=f[72]|0;if((a|0)==(e|0))break;O(e,a,e,a);a=w(1)|0;if(r)switch(a<<16>>16){case 93:case 125:break e;default:{}}e=f[72]|0;if(a<<16>>16!=44){C=51;break}f[72]=e+2;a=w(1)|0;e=f[72]|0;switch(a<<16>>16){case 91:case 123:{C=51;break r}default:{}}q(a)|0;}if((C|0)==51)f[72]=e+-2;if(!r)break e;f[72]=t+-2;break e}}}while(0);g=(w(1)|0)<<16>>16==102;e=f[72]|0;if(g?(m(e+2|0,60,6)|0)==0:0){f[72]=e+8;u(k,w(1)|0,0);e=(l|0)==0?240:l+16|0;while(1){e=f[e>>2]|0;if(!e)break e;f[e+12>>2]=0;f[e+8>>2]=0;e=e+16|0;}}f[72]=e+-2;}}while(0);return}function l(){var e=0,a=0,r=0,t=0,c=0,n=0,b=0;c=f[72]|0;r=c+12|0;f[72]=r;t=w(1)|0;a=f[72]|0;e:do{if(t<<16>>16!=46)if(t<<16>>16==115&a>>>0>r>>>0)if((m(a+2|0,50,10)|0)==0?(e=a+12|0,V(s[e>>1]|0)|0):0)n=14;else {a=6;r=0;n=46;}else {e=t;r=0;n=15;}else {f[72]=a+2;switch((w(1)|0)<<16>>16){case 109:{e=f[72]|0;if(m(e+2|0,44,6)|0)break e;a=f[69]|0;if(!(G(a)|0)?(s[a>>1]|0)==46:0)break e;d(c,c,e+8|0,2);break e}case 115:{e=f[72]|0;if(m(e+2|0,50,10)|0)break e;a=f[69]|0;if(!(G(a)|0)?(s[a>>1]|0)==46:0)break e;e=e+12|0;n=14;break e}default:break e}}}while(0);if((n|0)==14){f[72]=e;e=w(1)|0;r=1;n=15;}e:do{if((n|0)==15)switch(e<<16>>16){case 40:{a=f[70]|0;b=s[400]|0;t=b&65535;f[a+(t<<3)>>2]=5;e=f[72]|0;s[400]=b+1<<16>>16;f[a+(t<<3)+4>>2]=e;if((s[f[69]>>1]|0)==46)break e;f[72]=e+2;a=w(1)|0;d(c,f[72]|0,0,e);if(r){e=f[63]|0;f[e+28>>2]=5;}else e=f[63]|0;c=f[71]|0;b=s[399]|0;s[399]=b+1<<16>>16;f[c+((b&65535)<<2)>>2]=e;switch(a<<16>>16){case 39:{v(39);break}case 34:{v(34);break}default:{f[72]=(f[72]|0)+-2;break e}}e=(f[72]|0)+2|0;f[72]=e;switch((w(1)|0)<<16>>16){case 44:{f[72]=(f[72]|0)+2;w(1)|0;c=f[63]|0;f[c+4>>2]=e;b=f[72]|0;f[c+16>>2]=b;i[c+24>>0]=1;f[72]=b+-2;break e}case 41:{s[400]=(s[400]|0)+-1<<16>>16;b=f[63]|0;f[b+4>>2]=e;f[b+12>>2]=(f[72]|0)+2;i[b+24>>0]=1;s[399]=(s[399]|0)+-1<<16>>16;break e}default:{f[72]=(f[72]|0)+-2;break e}}}case 123:{if(r){a=12;r=1;n=46;break e}e=f[72]|0;if(s[400]|0){f[72]=e+-2;break e}while(1){if(e>>>0>=(f[73]|0)>>>0)break;e=w(1)|0;if(!(W(e)|0)){if(e<<16>>16==125){n=36;break}}else v(e);e=(f[72]|0)+2|0;f[72]=e;}if((n|0)==36)f[72]=(f[72]|0)+2;b=(w(1)|0)<<16>>16==102;e=f[72]|0;if(b?m(e+2|0,60,6)|0:0){T();break e}f[72]=e+8;e=w(1)|0;if(W(e)|0){u(c,e,0);break e}else {T();break e}}default:{if(r){a=12;r=1;n=46;break e}switch(e<<16>>16){case 42:case 39:case 34:{r=0;n=48;break e}default:{a=6;r=0;n=46;break e}}}}}while(0);if((n|0)==46){e=f[72]|0;if((e|0)==(c+(a<<1)|0))f[72]=e+-2;else n=48;}do{if((n|0)==48){if(s[400]|0){f[72]=(f[72]|0)+-2;break}e=f[73]|0;a=f[72]|0;while(1){if(a>>>0>=e>>>0){n=55;break}t=s[a>>1]|0;if(W(t)|0){n=53;break}b=a+2|0;f[72]=b;a=b;}if((n|0)==53){u(c,t,r);break}else if((n|0)==55){T();break}}}while(0);return}function u(e,a,r){e=e|0;a=a|0;r=r|0;var i=0,t=0;i=(f[72]|0)+2|0;switch(a<<16>>16){case 39:{v(39);t=5;break}case 34:{v(34);t=5;break}default:T();}do{if((t|0)==5){d(e,i,f[72]|0,1);if(r)f[(f[63]|0)+28>>2]=4;f[72]=(f[72]|0)+2;a=w(0)|0;r=a<<16>>16==97;if(r){i=f[72]|0;if(m(i+2|0,88,10)|0)t=13;}else {i=f[72]|0;if(!(((a<<16>>16==119?(s[i+2>>1]|0)==105:0)?(s[i+4>>1]|0)==116:0)?(s[i+6>>1]|0)==104:0))t=13;}if((t|0)==13){f[72]=i+-2;break}f[72]=i+((r?6:4)<<1);if((w(1)|0)<<16>>16!=123){f[72]=i;break}r=f[72]|0;a=r;e:while(1){f[72]=a+2;a=w(1)|0;switch(a<<16>>16){case 39:{v(39);f[72]=(f[72]|0)+2;a=w(1)|0;break}case 34:{v(34);f[72]=(f[72]|0)+2;a=w(1)|0;break}default:a=q(a)|0;}if(a<<16>>16!=58){t=22;break}f[72]=(f[72]|0)+2;switch((w(1)|0)<<16>>16){case 39:{v(39);break}case 34:{v(34);break}default:{t=26;break e}}f[72]=(f[72]|0)+2;switch((w(1)|0)<<16>>16){case 125:{t=31;break e}case 44:break;default:{t=30;break e}}f[72]=(f[72]|0)+2;if((w(1)|0)<<16>>16==125){t=31;break}a=f[72]|0;}if((t|0)==22){f[72]=i;break}else if((t|0)==26){f[72]=i;break}else if((t|0)==30){f[72]=i;break}else if((t|0)==31){t=f[63]|0;f[t+16>>2]=r;f[t+12>>2]=(f[72]|0)+2;break}}}while(0);return}function o(e){e=e|0;e:do{switch(s[e>>1]|0){case 100:switch(s[e+-2>>1]|0){case 105:{e=$(e+-4|0,98,2)|0;break e}case 108:{e=$(e+-4|0,102,3)|0;break e}default:{e=0;break e}}case 101:switch(s[e+-2>>1]|0){case 115:switch(s[e+-4>>1]|0){case 108:{e=B(e+-6|0,101)|0;break e}case 97:{e=B(e+-6|0,99)|0;break e}default:{e=0;break e}}case 116:{e=$(e+-4|0,108,4)|0;break e}case 117:{e=$(e+-4|0,116,6)|0;break e}default:{e=0;break e}}case 102:{if((s[e+-2>>1]|0)==111?(s[e+-4>>1]|0)==101:0)switch(s[e+-6>>1]|0){case 99:{e=$(e+-8|0,128,6)|0;break e}case 112:{e=$(e+-8|0,140,2)|0;break e}default:{e=0;break e}}else e=0;break}case 107:{e=$(e+-2|0,144,4)|0;break}case 110:{e=e+-2|0;if(B(e,105)|0)e=1;else e=$(e,152,5)|0;break}case 111:{e=B(e+-2|0,100)|0;break}case 114:{e=$(e+-2|0,162,7)|0;break}case 116:{e=$(e+-2|0,176,4)|0;break}case 119:switch(s[e+-2>>1]|0){case 101:{e=B(e+-4|0,110)|0;break e}case 111:{e=$(e+-4|0,184,3)|0;break e}default:{e=0;break e}}default:e=0;}}while(0);return e|0}function h(){var e=0,a=0,r=0,i=0;a=f[73]|0;r=f[72]|0;e:while(1){e=r+2|0;if(r>>>0>=a>>>0){a=10;break}switch(s[e>>1]|0){case 96:{a=7;break e}case 36:{if((s[r+4>>1]|0)==123){a=6;break e}break}case 92:{e=r+4|0;break}default:{}}r=e;}if((a|0)==6){e=r+4|0;f[72]=e;a=f[70]|0;i=s[400]|0;r=i&65535;f[a+(r<<3)>>2]=4;s[400]=i+1<<16>>16;f[a+(r<<3)+4>>2]=e;}else if((a|0)==7){f[72]=e;r=f[70]|0;i=(s[400]|0)+-1<<16>>16;s[400]=i;if((f[r+((i&65535)<<3)>>2]|0)!=3)T();}else if((a|0)==10){f[72]=e;T();}return}function w(e){e=e|0;var a=0,r=0,i=0;r=f[72]|0;e:do{a=s[r>>1]|0;a:do{if(a<<16>>16!=47)if(e)if(V(a)|0)break;else break e;else if(F(a)|0)break;else break e;else switch(s[r+2>>1]|0){case 47:{P();break a}case 42:{y(e);break a}default:{a=47;break e}}}while(0);i=f[72]|0;r=i+2|0;f[72]=r;}while(i>>>0<(f[73]|0)>>>0);return a|0}function d(e,a,r,s){e=e|0;a=a|0;r=r|0;s=s|0;var t=0,c=0;c=f[67]|0;f[67]=c+36;t=f[63]|0;f[((t|0)==0?236:t+32|0)>>2]=c;f[64]=t;f[63]=c;f[c+8>>2]=e;if(2==(s|0)){e=3;t=r;}else {t=1==(s|0);e=t?1:2;t=t?r+2|0:0;}f[c+12>>2]=t;f[c+28>>2]=e;f[c>>2]=a;f[c+4>>2]=r;f[c+16>>2]=0;f[c+20>>2]=s;a=1==(s|0);i[c+24>>0]=a&1;f[c+32>>2]=0;if(a|2==(s|0))i[803]=1;return}function v(e){e=e|0;var a=0,r=0,i=0,t=0;t=f[73]|0;a=f[72]|0;while(1){i=a+2|0;if(a>>>0>=t>>>0){a=9;break}r=s[i>>1]|0;if(r<<16>>16==e<<16>>16){a=10;break}if(r<<16>>16==92){r=a+4|0;if((s[r>>1]|0)==13){a=a+6|0;a=(s[a>>1]|0)==10?a:r;}else a=r;}else if(Z(r)|0){a=9;break}else a=i;}if((a|0)==9){f[72]=i;T();}else if((a|0)==10)f[72]=i;return}function A(e,a){e=e|0;a=a|0;var r=0,i=0,t=0,c=0;r=f[72]|0;i=s[r>>1]|0;c=(e|0)==(a|0);t=c?0:e;c=c?0:a;if(i<<16>>16==97){f[72]=r+4;r=w(1)|0;e=f[72]|0;if(W(r)|0){v(r);a=(f[72]|0)+2|0;f[72]=a;}else {q(r)|0;a=f[72]|0;}i=w(1)|0;r=f[72]|0;}if((r|0)!=(e|0))O(e,a,t,c);return i|0}function C(){var e=0,a=0,r=0;r=f[73]|0;a=f[72]|0;e:while(1){e=a+2|0;if(a>>>0>=r>>>0){a=6;break}switch(s[e>>1]|0){case 13:case 10:{a=6;break e}case 93:{a=7;break e}case 92:{e=a+4|0;break}default:{}}a=e;}if((a|0)==6){f[72]=e;T();e=0;}else if((a|0)==7){f[72]=e;e=93;}return e|0}function g(){var e=0,a=0,r=0;e:while(1){e=f[72]|0;a=e+2|0;f[72]=a;if(e>>>0>=(f[73]|0)>>>0){r=7;break}switch(s[a>>1]|0){case 13:case 10:{r=7;break e}case 47:break e;case 91:{C()|0;break}case 92:{f[72]=e+4;break}default:{}}}if((r|0)==7)T();return}function p(e){e=e|0;switch(s[e>>1]|0){case 62:{e=(s[e+-2>>1]|0)==61;break}case 41:case 59:{e=1;break}case 104:{e=$(e+-2|0,210,4)|0;break}case 121:{e=$(e+-2|0,218,6)|0;break}case 101:{e=$(e+-2|0,230,3)|0;break}default:e=0;}return e|0}function y(e){e=e|0;var a=0,r=0,i=0,t=0,c=0;t=(f[72]|0)+2|0;f[72]=t;r=f[73]|0;while(1){a=t+2|0;if(t>>>0>=r>>>0)break;i=s[a>>1]|0;if(!e?Z(i)|0:0)break;if(i<<16>>16==42?(s[t+4>>1]|0)==47:0){c=8;break}t=a;}if((c|0)==8){f[72]=a;a=t+4|0;}f[72]=a;return}function m(e,a,r){e=e|0;a=a|0;r=r|0;var s=0,f=0;e:do{if(!r)e=0;else {while(1){s=i[e>>0]|0;f=i[a>>0]|0;if(s<<24>>24!=f<<24>>24)break;r=r+-1|0;if(!r){e=0;break e}else {e=e+1|0;a=a+1|0;}}e=(s&255)-(f&255)|0;}}while(0);return e|0}function I(e){e=e|0;e:do{switch(e<<16>>16){case 38:case 37:case 33:{e=1;break}default:if((e&-8)<<16>>16==40|(e+-58&65535)<6)e=1;else {switch(e<<16>>16){case 91:case 93:case 94:{e=1;break e}default:{}}e=(e+-123&65535)<4;}}}while(0);return e|0}function U(e){e=e|0;e:do{switch(e<<16>>16){case 38:case 37:case 33:break;default:if(!((e+-58&65535)<6|(e+-40&65535)<7&e<<16>>16!=41)){switch(e<<16>>16){case 91:case 94:break e;default:{}}return e<<16>>16!=125&(e+-123&65535)<4|0}}}while(0);return 1}function x(e){e=e|0;var a=0;a=s[e>>1]|0;e:do{if((a+-9&65535)>=5){switch(a<<16>>16){case 160:case 32:{a=1;break e}default:{}}if(I(a)|0)return a<<16>>16!=46|(G(e)|0)|0;else a=0;}else a=1;}while(0);return a|0}function S(e){e=e|0;var a=0,r=0,i=0,t=0;r=n;n=n+16|0;i=r;f[i>>2]=0;f[66]=e;a=f[3]|0;t=a+(e<<1)|0;e=t+2|0;s[t>>1]=0;f[i>>2]=e;f[67]=e;f[59]=0;f[63]=0;f[61]=0;f[60]=0;f[65]=0;f[62]=0;n=r;return a|0}function O(e,a,r,s){e=e|0;a=a|0;r=r|0;s=s|0;var t=0,c=0;t=f[67]|0;f[67]=t+20;c=f[65]|0;f[((c|0)==0?240:c+16|0)>>2]=t;f[65]=t;f[t>>2]=e;f[t+4>>2]=a;f[t+8>>2]=r;f[t+12>>2]=s;f[t+16>>2]=0;i[803]=1;return}function $(e,a,r){e=e|0;a=a|0;r=r|0;var i=0,s=0;i=e+(0-r<<1)|0;s=i+2|0;e=f[3]|0;if(s>>>0>=e>>>0?(m(s,a,r<<1)|0)==0:0)if((s|0)==(e|0))e=1;else e=x(i)|0;else e=0;return e|0}function j(e){e=e|0;switch(s[e>>1]|0){case 107:{e=$(e+-2|0,144,4)|0;break}case 101:{if((s[e+-2>>1]|0)==117)e=$(e+-4|0,116,6)|0;else e=0;break}default:e=0;}return e|0}function B(e,a){e=e|0;a=a|0;var r=0;r=f[3]|0;if(r>>>0<=e>>>0?(s[e>>1]|0)==a<<16>>16:0)if((r|0)==(e|0))r=1;else r=E(s[e+-2>>1]|0)|0;else r=0;return r|0}function E(e){e=e|0;e:do{if((e+-9&65535)<5)e=1;else {switch(e<<16>>16){case 32:case 160:{e=1;break e}default:{}}e=e<<16>>16!=46&(I(e)|0);}}while(0);return e|0}function P(){var e=0,a=0,r=0;e=f[73]|0;r=f[72]|0;e:while(1){a=r+2|0;if(r>>>0>=e>>>0)break;switch(s[a>>1]|0){case 13:case 10:break e;default:r=a;}}f[72]=a;return}function q(e){e=e|0;while(1){if(V(e)|0)break;if(I(e)|0)break;e=(f[72]|0)+2|0;f[72]=e;e=s[e>>1]|0;if(!(e<<16>>16)){e=0;break}}return e|0}function z(){var e=0;e=f[(f[61]|0)+20>>2]|0;switch(e|0){case 1:{e=-1;break}case 2:{e=-2;break}default:e=e-(f[3]|0)>>1;}return e|0}function D(e){e=e|0;if(!($(e,190,5)|0)?!($(e,200,3)|0):0)e=$(e,206,2)|0;else e=1;return e|0}function F(e){e=e|0;switch(e<<16>>16){case 160:case 32:case 12:case 11:case 9:{e=1;break}default:e=0;}return e|0}function G(e){e=e|0;if((s[e>>1]|0)==46?(s[e+-2>>1]|0)==46:0)e=(s[e+-4>>1]|0)==46;else e=0;return e|0}function H(e){e=e|0;if((f[3]|0)==(e|0))e=1;else e=x(e+-2|0)|0;return e|0}function J(){var e=0;e=f[(f[62]|0)+12>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function K(){var e=0;e=f[(f[61]|0)+12>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function L(){var e=0;e=f[(f[62]|0)+8>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function M(){var e=0;e=f[(f[61]|0)+16>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function N(){var e=0;e=f[(f[61]|0)+4>>2]|0;if(!e)e=-1;else e=e-(f[3]|0)>>1;return e|0}function Q(){var e=0;e=f[61]|0;e=f[((e|0)==0?236:e+32|0)>>2]|0;f[61]=e;return (e|0)!=0|0}function R(){var e=0;e=f[62]|0;e=f[((e|0)==0?240:e+16|0)>>2]|0;f[62]=e;return (e|0)!=0|0}function T(){i[802]=1;f[68]=(f[72]|0)-(f[3]|0)>>1;f[72]=(f[73]|0)+2;return}function V(e){e=e|0;return (e|128)<<16>>16==160|(e+-9&65535)<5|0}function W(e){e=e|0;return e<<16>>16==39|e<<16>>16==34|0}function X(){return (f[(f[61]|0)+8>>2]|0)-(f[3]|0)>>1|0}function Y(){return (f[(f[62]|0)+4>>2]|0)-(f[3]|0)>>1|0}function Z(e){e=e|0;return e<<16>>16==13|e<<16>>16==10|0}function _(){return (f[f[61]>>2]|0)-(f[3]|0)>>1|0}function ee(){return (f[f[62]>>2]|0)-(f[3]|0)>>1|0}function ae(){return t[(f[61]|0)+24>>0]|0|0}function re(e){e=e|0;f[3]=e;return}function ie(){return f[(f[61]|0)+28>>2]|0}function se(){return (i[803]|0)!=0|0}function fe(){return (i[804]|0)!=0|0}function te(){return f[68]|0}function ce(e){e=e|0;n=e+992+15&-16;return 992}return {su:ce,ai:M,e:te,ee:Y,ele:J,els:L,es:ee,f:fe,id:z,ie:N,ip:ae,is:_,it:ie,ms:se,p:b,re:R,ri:Q,sa:S,se:K,ses:re,ss:X}}("undefined"!=typeof self?self:global,{},a),r=e.su(i-(2<<17));}const h=t.length+1;e.ses(r),e.sa(h-1),s(t,new Uint16Array(a,r,h)),e.p()||(n=e.e(),o());const w=[],d=[];for(;e.ri();){const a=e.is(),r=e.ie(),i=e.ai(),s=e.id(),f=e.ss(),c=e.se(),n=e.it();let k;e.ip()&&(k=b(-1===s?a:a+1,t.charCodeAt(-1===s?a-1:a))),w.push({t:n,n:k,s:a,e:r,ss:f,se:c,d:s,a:i});}for(;e.re();){const a=e.es(),r=e.ee(),i=e.els(),s=e.ele(),f=t.charCodeAt(a),c=i>=0?t.charCodeAt(i):-1;d.push({s:a,e:r,ls:i,le:s,n:34===f||39===f?b(a+1,f):t.slice(a,r),ln:i<0?void 0:34===c||39===c?b(i+1,c):t.slice(i,s)});}return [w,d,!!e.f(),!!e.ms()]}function b(e,a){n=e;let r="",i=n;for(;;){n>=t.length&&o();const e=t.charCodeAt(n);if(e===a)break;92===e?(r+=t.slice(i,n),r+=k(),i=n):(8232===e||8233===e||u(e)&&o(),++n);}return r+=t.slice(i,n++),r}function k(){let e=t.charCodeAt(++n);switch(++n,e){case 110:return "\n";case 114:return "\r";case 120:return String.fromCharCode(l(2));case 117:return function(){const e=t.charCodeAt(n);let a;123===e?(++n,a=l(t.indexOf("}",n)-n),++n,a>1114111&&o()):a=l(4);return a<=65535?String.fromCharCode(a):(a-=65536,String.fromCharCode(55296+(a>>10),56320+(1023&a)))}();case 116:return "\t";case 98:return "\b";case 118:return "\v";case 102:return "\f";case 13:10===t.charCodeAt(n)&&++n;case 10:return "";case 56:case 57:o();default:if(e>=48&&e<=55){let a=t.substr(n-1,3).match(/^[0-7]+/)[0],r=parseInt(a,8);return r>255&&(a=a.slice(0,-1),r=parseInt(a,8)),n+=a.length-1,e=t.charCodeAt(n),"0"===a&&56!==e&&57!==e||o(),String.fromCharCode(r)}return u(e)?"":String.fromCharCode(e)}}function l(e){const a=n;let r=0,i=0;for(let a=0;a<e;++a,++n){let e,s=t.charCodeAt(n);if(95!==s){if(s>=97)e=s-97+10;else if(s>=65)e=s-65+10;else {if(!(s>=48&&s<=57))break;e=s-48;}if(e>=16)break;i=s,r=16*r+e;}else 95!==i&&0!==a||o(),i=s;}return 95!==i&&n-a===e||o(),r}function u(e){return 13===e||10===e}function o(){throw Object.assign(Error(`Parse error ${c}:${t.slice(0,n).split("\n").length}:${n-t.lastIndexOf("\n",n-1)}`),{idx:n})}

let wasmParserInitialized = false;
init.then(() => {
  wasmParserInitialized = true;
});
const parseEsm = (code, filename) => wasmParserInitialized ? parse$1(code, filename) : parse(code, filename);
const isESM = (code) => {
  if (!code.includes("import") && !code.includes("export")) {
    return false;
  }
  try {
    const hasModuleSyntax = parseEsm(code)[3];
    return hasModuleSyntax;
  } catch {
    return true;
  }
};

const version = "2";
const toEsmFunctionString = ((imported) => {
  const d = "default";
  if (imported[d] && typeof imported[d] === "object" && "__esModule" in imported[d]) {
    return imported[d];
  }
  return imported;
}).toString();
const handleDynamicImport = `.then(${toEsmFunctionString})`;
const transformDynamicImport = (filePath, code, isMinified) => {
  if (isMinified) {
    if (!code.includes("import(")) {
      return;
    }
  } else if (!code.includes("import")) {
    return;
  }
  const parsed = parseEsm(code, filePath);
  const dynamicImports = parsed[0].filter((maybeDynamic) => maybeDynamic.d > -1);
  if (dynamicImports.length === 0) {
    return;
  }
  const magicString = new MagicString(code);
  for (const dynamicImport of dynamicImports) {
    magicString.appendRight(dynamicImport.se, handleDynamicImport);
  }
  const newCode = magicString.toString();
  const newMap = magicString.generateMap({
    source: filePath,
    includeContent: false,
    /**
     * The performance hit on this is very high
     * Since we're only transforming import()s, I think this may be overkill
     */
    hires: "boundary"
  });
  return {
    code: newCode,
    map: newMap
  };
};

const readJsonFile = (filePath) => {
  try {
    const jsonString = fs.readFileSync(filePath, "utf8");
    return JSON.parse(jsonString);
  } catch {
  }
};

const noop = () => {
};
const getTime = () => Math.floor(Date.now() / 1e8);
class FileCache extends Map {
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
  cacheDirectory = temporaryDirectory.tmpdir;
  // Maintained so we can remove it on Windows
  oldCacheDirectory = path.join(os.tmpdir(), "tsx");
  cacheFiles;
  constructor() {
    super();
    fs.mkdirSync(this.cacheDirectory, { recursive: true });
    this.cacheFiles = fs.readdirSync(this.cacheDirectory).map((fileName) => {
      const [time, key] = fileName.split("-");
      return {
        time: Number(time),
        key,
        fileName
      };
    });
    setImmediate(() => {
      this.expireDiskCache();
      this.removeOldCacheDirectory();
    });
  }
  get(key) {
    const memoryCacheHit = super.get(key);
    if (memoryCacheHit) {
      return memoryCacheHit;
    }
    const diskCacheHit = this.cacheFiles.find((cache) => cache.key === key);
    if (!diskCacheHit) {
      return;
    }
    const cacheFilePath = path.join(this.cacheDirectory, diskCacheHit.fileName);
    const cachedResult = readJsonFile(cacheFilePath);
    if (!cachedResult) {
      fs.promises.unlink(cacheFilePath).then(
        () => {
          const index = this.cacheFiles.indexOf(diskCacheHit);
          this.cacheFiles.splice(index, 1);
        },
        () => {
        }
      );
      return;
    }
    super.set(key, cachedResult);
    return cachedResult;
  }
  set(key, value) {
    super.set(key, value);
    if (value) {
      const time = getTime();
      fs.promises.writeFile(
        path.join(this.cacheDirectory, `${time}-${key}`),
        JSON.stringify(value)
      ).catch(noop);
    }
    return this;
  }
  expireDiskCache() {
    const time = getTime();
    for (const cache of this.cacheFiles) {
      if (time - cache.time > 7) {
        fs.promises.unlink(path.join(this.cacheDirectory, cache.fileName)).catch(noop);
      }
    }
  }
  async removeOldCacheDirectory() {
    try {
      const exists = await fs.promises.access(this.oldCacheDirectory).then(() => true);
      if (exists) {
        if ("rm" in fs.promises) {
          await fs.promises.rm(
            this.oldCacheDirectory,
            {
              recursive: true,
              force: true
            }
          );
        } else {
          await fs.promises.rmdir(
            this.oldCacheDirectory,
            { recursive: true }
          );
        }
      }
    } catch {
    }
  }
}
var cache = process.env.TSX_DISABLE_CACHE ? /* @__PURE__ */ new Map() : new FileCache();

// Matches the scheme of a URL, eg "http://"
const schemeRegex = /^[\w+.-]+:\/\//;
/**
 * Matches the parts of a URL:
 * 1. Scheme, including ":", guaranteed.
 * 2. User/password, including "@", optional.
 * 3. Host, guaranteed.
 * 4. Port, including ":", optional.
 * 5. Path, including "/", optional.
 * 6. Query, including "?", optional.
 * 7. Hash, including "#", optional.
 */
const urlRegex = /^([\w+.-]+:)\/\/([^@/#?]*@)?([^:/#?]*)(:\d+)?(\/[^#?]*)?(\?[^#]*)?(#.*)?/;
/**
 * File URLs are weird. They dont' need the regular `//` in the scheme, they may or may not start
 * with a leading `/`, they can have a domain (but only if they don't start with a Windows drive).
 *
 * 1. Host, optional.
 * 2. Path, which may include "/", guaranteed.
 * 3. Query, including "?", optional.
 * 4. Hash, including "#", optional.
 */
const fileRegex = /^file:(?:\/\/((?![a-z]:)[^/#?]*)?)?(\/?[^#?]*)(\?[^#]*)?(#.*)?/i;
function isAbsoluteUrl(input) {
    return schemeRegex.test(input);
}
function isSchemeRelativeUrl(input) {
    return input.startsWith('//');
}
function isAbsolutePath(input) {
    return input.startsWith('/');
}
function isFileUrl(input) {
    return input.startsWith('file:');
}
function isRelative(input) {
    return /^[.?#]/.test(input);
}
function parseAbsoluteUrl(input) {
    const match = urlRegex.exec(input);
    return makeUrl(match[1], match[2] || '', match[3], match[4] || '', match[5] || '/', match[6] || '', match[7] || '');
}
function parseFileUrl(input) {
    const match = fileRegex.exec(input);
    const path = match[2];
    return makeUrl('file:', '', match[1] || '', '', isAbsolutePath(path) ? path : '/' + path, match[3] || '', match[4] || '');
}
function makeUrl(scheme, user, host, port, path, query, hash) {
    return {
        scheme,
        user,
        host,
        port,
        path,
        query,
        hash,
        type: 7 /* Absolute */,
    };
}
function parseUrl(input) {
    if (isSchemeRelativeUrl(input)) {
        const url = parseAbsoluteUrl('http:' + input);
        url.scheme = '';
        url.type = 6 /* SchemeRelative */;
        return url;
    }
    if (isAbsolutePath(input)) {
        const url = parseAbsoluteUrl('http://foo.com' + input);
        url.scheme = '';
        url.host = '';
        url.type = 5 /* AbsolutePath */;
        return url;
    }
    if (isFileUrl(input))
        return parseFileUrl(input);
    if (isAbsoluteUrl(input))
        return parseAbsoluteUrl(input);
    const url = parseAbsoluteUrl('http://foo.com/' + input);
    url.scheme = '';
    url.host = '';
    url.type = input
        ? input.startsWith('?')
            ? 3 /* Query */
            : input.startsWith('#')
                ? 2 /* Hash */
                : 4 /* RelativePath */
        : 1 /* Empty */;
    return url;
}
function stripPathFilename(path) {
    // If a path ends with a parent directory "..", then it's a relative path with excess parent
    // paths. It's not a file, so we can't strip it.
    if (path.endsWith('/..'))
        return path;
    const index = path.lastIndexOf('/');
    return path.slice(0, index + 1);
}
function mergePaths(url, base) {
    normalizePath(base, base.type);
    // If the path is just a "/", then it was an empty path to begin with (remember, we're a relative
    // path).
    if (url.path === '/') {
        url.path = base.path;
    }
    else {
        // Resolution happens relative to the base path's directory, not the file.
        url.path = stripPathFilename(base.path) + url.path;
    }
}
/**
 * The path can have empty directories "//", unneeded parents "foo/..", or current directory
 * "foo/.". We need to normalize to a standard representation.
 */
function normalizePath(url, type) {
    const rel = type <= 4 /* RelativePath */;
    const pieces = url.path.split('/');
    // We need to preserve the first piece always, so that we output a leading slash. The item at
    // pieces[0] is an empty string.
    let pointer = 1;
    // Positive is the number of real directories we've output, used for popping a parent directory.
    // Eg, "foo/bar/.." will have a positive 2, and we can decrement to be left with just "foo".
    let positive = 0;
    // We need to keep a trailing slash if we encounter an empty directory (eg, splitting "foo/" will
    // generate `["foo", ""]` pieces). And, if we pop a parent directory. But once we encounter a
    // real directory, we won't need to append, unless the other conditions happen again.
    let addTrailingSlash = false;
    for (let i = 1; i < pieces.length; i++) {
        const piece = pieces[i];
        // An empty directory, could be a trailing slash, or just a double "//" in the path.
        if (!piece) {
            addTrailingSlash = true;
            continue;
        }
        // If we encounter a real directory, then we don't need to append anymore.
        addTrailingSlash = false;
        // A current directory, which we can always drop.
        if (piece === '.')
            continue;
        // A parent directory, we need to see if there are any real directories we can pop. Else, we
        // have an excess of parents, and we'll need to keep the "..".
        if (piece === '..') {
            if (positive) {
                addTrailingSlash = true;
                positive--;
                pointer--;
            }
            else if (rel) {
                // If we're in a relativePath, then we need to keep the excess parents. Else, in an absolute
                // URL, protocol relative URL, or an absolute path, we don't need to keep excess.
                pieces[pointer++] = piece;
            }
            continue;
        }
        // We've encountered a real directory. Move it to the next insertion pointer, which accounts for
        // any popped or dropped directories.
        pieces[pointer++] = piece;
        positive++;
    }
    let path = '';
    for (let i = 1; i < pointer; i++) {
        path += '/' + pieces[i];
    }
    if (!path || (addTrailingSlash && !path.endsWith('/..'))) {
        path += '/';
    }
    url.path = path;
}
/**
 * Attempts to resolve `input` URL/path relative to `base`.
 */
function resolve$1(input, base) {
    if (!input && !base)
        return '';
    const url = parseUrl(input);
    let inputType = url.type;
    if (base && inputType !== 7 /* Absolute */) {
        const baseUrl = parseUrl(base);
        const baseType = baseUrl.type;
        switch (inputType) {
            case 1 /* Empty */:
                url.hash = baseUrl.hash;
            // fall through
            case 2 /* Hash */:
                url.query = baseUrl.query;
            // fall through
            case 3 /* Query */:
            case 4 /* RelativePath */:
                mergePaths(url, baseUrl);
            // fall through
            case 5 /* AbsolutePath */:
                // The host, user, and port are joined, you can't copy one without the others.
                url.user = baseUrl.user;
                url.host = baseUrl.host;
                url.port = baseUrl.port;
            // fall through
            case 6 /* SchemeRelative */:
                // The input doesn't have a schema at least, so we need to copy at least that over.
                url.scheme = baseUrl.scheme;
        }
        if (baseType > inputType)
            inputType = baseType;
    }
    normalizePath(url, inputType);
    const queryHash = url.query + url.hash;
    switch (inputType) {
        // This is impossible, because of the empty checks at the start of the function.
        // case UrlType.Empty:
        case 2 /* Hash */:
        case 3 /* Query */:
            return queryHash;
        case 4 /* RelativePath */: {
            // The first char is always a "/", and we need it to be relative.
            const path = url.path.slice(1);
            if (!path)
                return queryHash || '.';
            if (isRelative(base || input) && !isRelative(path)) {
                // If base started with a leading ".", or there is no base and input started with a ".",
                // then we need to ensure that the relative path starts with a ".". We don't know if
                // relative starts with a "..", though, so check before prepending.
                return './' + path + queryHash;
            }
            return path + queryHash;
        }
        case 5 /* AbsolutePath */:
            return url.path + queryHash;
        default:
            return url.scheme + '//' + url.user + url.host + url.port + url.path + queryHash;
    }
}

function resolve(input, base) {
    // The base is always treated as a directory, if it's not empty.
    // https://github.com/mozilla/source-map/blob/8cb3ee57/lib/util.js#L327
    // https://github.com/chromium/chromium/blob/da4adbb3/third_party/blink/renderer/devtools/front_end/sdk/SourceMap.js#L400-L401
    if (base && !base.endsWith('/'))
        base += '/';
    return resolve$1(input, base);
}

/**
 * Removes everything after the last "/", but leaves the slash.
 */
function stripFilename(path) {
    if (!path)
        return '';
    const index = path.lastIndexOf('/');
    return path.slice(0, index + 1);
}

const COLUMN$1 = 0;

function maybeSort(mappings, owned) {
    const unsortedIndex = nextUnsortedSegmentLine(mappings, 0);
    if (unsortedIndex === mappings.length)
        return mappings;
    // If we own the array (meaning we parsed it from JSON), then we're free to directly mutate it. If
    // not, we do not want to modify the consumer's input array.
    if (!owned)
        mappings = mappings.slice();
    for (let i = unsortedIndex; i < mappings.length; i = nextUnsortedSegmentLine(mappings, i + 1)) {
        mappings[i] = sortSegments(mappings[i], owned);
    }
    return mappings;
}
function nextUnsortedSegmentLine(mappings, start) {
    for (let i = start; i < mappings.length; i++) {
        if (!isSorted(mappings[i]))
            return i;
    }
    return mappings.length;
}
function isSorted(line) {
    for (let j = 1; j < line.length; j++) {
        if (line[j][COLUMN$1] < line[j - 1][COLUMN$1]) {
            return false;
        }
    }
    return true;
}
function sortSegments(line, owned) {
    if (!owned)
        line = line.slice();
    return line.sort(sortComparator);
}
function sortComparator(a, b) {
    return a[COLUMN$1] - b[COLUMN$1];
}

let found = false;
/**
 * A binary search implementation that returns the index if a match is found.
 * If no match is found, then the left-index (the index associated with the item that comes just
 * before the desired index) is returned. To maintain proper sort order, a splice would happen at
 * the next index:
 *
 * ```js
 * const array = [1, 3];
 * const needle = 2;
 * const index = binarySearch(array, needle, (item, needle) => item - needle);
 *
 * assert.equal(index, 0);
 * array.splice(index + 1, 0, needle);
 * assert.deepEqual(array, [1, 2, 3]);
 * ```
 */
function binarySearch(haystack, needle, low, high) {
    while (low <= high) {
        const mid = low + ((high - low) >> 1);
        const cmp = haystack[mid][COLUMN$1] - needle;
        if (cmp === 0) {
            found = true;
            return mid;
        }
        if (cmp < 0) {
            low = mid + 1;
        }
        else {
            high = mid - 1;
        }
    }
    found = false;
    return low - 1;
}
function lowerBound(haystack, needle, index) {
    for (let i = index - 1; i >= 0; index = i--) {
        if (haystack[i][COLUMN$1] !== needle)
            break;
    }
    return index;
}
function memoizedState() {
    return {
        lastKey: -1,
        lastNeedle: -1,
        lastIndex: -1,
    };
}
/**
 * This overly complicated beast is just to record the last tested line/column and the resulting
 * index, allowing us to skip a few tests if mappings are monotonically increasing.
 */
function memoizedBinarySearch(haystack, needle, state, key) {
    const { lastKey, lastNeedle, lastIndex } = state;
    let low = 0;
    let high = haystack.length - 1;
    if (key === lastKey) {
        if (needle === lastNeedle) {
            found = lastIndex !== -1 && haystack[lastIndex][COLUMN$1] === needle;
            return lastIndex;
        }
        if (needle >= lastNeedle) {
            // lastIndex may be -1 if the previous needle was not found.
            low = lastIndex === -1 ? 0 : lastIndex;
        }
        else {
            high = lastIndex;
        }
    }
    state.lastKey = key;
    state.lastNeedle = needle;
    return (state.lastIndex = binarySearch(haystack, needle, low, high));
}
class TraceMap {
    constructor(map, mapUrl) {
        const isString = typeof map === 'string';
        if (!isString && map._decodedMemo)
            return map;
        const parsed = (isString ? JSON.parse(map) : map);
        const { version, file, names, sourceRoot, sources, sourcesContent } = parsed;
        this.version = version;
        this.file = file;
        this.names = names || [];
        this.sourceRoot = sourceRoot;
        this.sources = sources;
        this.sourcesContent = sourcesContent;
        this.ignoreList = parsed.ignoreList || parsed.x_google_ignoreList || undefined;
        const from = resolve(sourceRoot || '', stripFilename(mapUrl));
        this.resolvedSources = sources.map((s) => resolve(s || '', from));
        const { mappings } = parsed;
        if (typeof mappings === 'string') {
            this._encoded = mappings;
            this._decoded = undefined;
        }
        else {
            this._encoded = undefined;
            this._decoded = maybeSort(mappings, isString);
        }
        this._decodedMemo = memoizedState();
        this._bySources = undefined;
        this._bySourceMemos = undefined;
    }
}
/**
 * Typescript doesn't allow friend access to private fields, so this just casts the map into a type
 * with public access modifiers.
 */
function cast$2(map) {
    return map;
}
/**
 * Returns the decoded (array of lines of segments) form of the SourceMap's mappings field.
 */
function decodedMappings(map) {
    var _a;
    return ((_a = cast$2(map))._decoded || (_a._decoded = decode(cast$2(map)._encoded)));
}
/**
 * A low-level API to find the segment associated with a generated line/column (think, from a
 * stack trace). Line and column here are 0-based, unlike `originalPositionFor`.
 */
function traceSegment(map, line, column) {
    const decoded = decodedMappings(map);
    // It's common for parent source maps to have pointers to lines that have no
    // mapping (like a "//# sourceMappingURL=") at the end of the child file.
    if (line >= decoded.length)
        return null;
    const segments = decoded[line];
    const index = traceSegmentInternal(segments, cast$2(map)._decodedMemo, line, column);
    return index === -1 ? null : segments[index];
}
function traceSegmentInternal(segments, memo, line, column, bias) {
    let index = memoizedBinarySearch(segments, column, memo, line);
    if (found) {
        index = (lowerBound)(segments, column, index);
    }
    if (index === -1 || index === segments.length)
        return -1;
    return index;
}

/**
 * SetArray acts like a `Set` (allowing only one occurrence of a string `key`), but provides the
 * index of the `key` in the backing array.
 *
 * This is designed to allow synchronizing a second array with the contents of the backing array,
 * like how in a sourcemap `sourcesContent[i]` is the source content associated with `source[i]`,
 * and there are never duplicates.
 */
class SetArray {
    constructor() {
        this._indexes = { __proto__: null };
        this.array = [];
    }
}
/**
 * Typescript doesn't allow friend access to private fields, so this just casts the set into a type
 * with public access modifiers.
 */
function cast$1(set) {
    return set;
}
/**
 * Gets the index associated with `key` in the backing array, if it is already present.
 */
function get(setarr, key) {
    return cast$1(setarr)._indexes[key];
}
/**
 * Puts `key` into the backing array, if it is not already present. Returns
 * the index of the `key` in the backing array.
 */
function put(setarr, key) {
    // The key may or may not be present. If it is present, it's a number.
    const index = get(setarr, key);
    if (index !== undefined)
        return index;
    const { array, _indexes: indexes } = cast$1(setarr);
    const length = array.push(key);
    return (indexes[key] = length - 1);
}
/**
 * Removes the key, if it exists in the set.
 */
function remove(setarr, key) {
    const index = get(setarr, key);
    if (index === undefined)
        return;
    const { array, _indexes: indexes } = cast$1(setarr);
    for (let i = index + 1; i < array.length; i++) {
        const k = array[i];
        array[i - 1] = k;
        indexes[k]--;
    }
    indexes[key] = undefined;
    array.pop();
}

const COLUMN = 0;
const SOURCES_INDEX = 1;
const SOURCE_LINE = 2;
const SOURCE_COLUMN = 3;
const NAMES_INDEX = 4;

const NO_NAME = -1;
/**
 * Provides the state to generate a sourcemap.
 */
class GenMapping {
    constructor({ file, sourceRoot } = {}) {
        this._names = new SetArray();
        this._sources = new SetArray();
        this._sourcesContent = [];
        this._mappings = [];
        this.file = file;
        this.sourceRoot = sourceRoot;
        this._ignoreList = new SetArray();
    }
}
/**
 * Typescript doesn't allow friend access to private fields, so this just casts the map into a type
 * with public access modifiers.
 */
function cast(map) {
    return map;
}
/**
 * Same as `addSegment`, but will only add the segment if it generates useful information in the
 * resulting map. This only works correctly if segments are added **in order**, meaning you should
 * not add a segment with a lower generated line/column than one that came before.
 */
const maybeAddSegment = (map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) => {
    return addSegmentInternal(true, map, genLine, genColumn, source, sourceLine, sourceColumn, name);
};
/**
 * Adds/removes the content of the source file to the source map.
 */
function setSourceContent(map, source, content) {
    const { _sources: sources, _sourcesContent: sourcesContent } = cast(map);
    const index = put(sources, source);
    sourcesContent[index] = content;
}
function setIgnore(map, source, ignore = true) {
    const { _sources: sources, _sourcesContent: sourcesContent, _ignoreList: ignoreList } = cast(map);
    const index = put(sources, source);
    if (index === sourcesContent.length)
        sourcesContent[index] = null;
    if (ignore)
        put(ignoreList, index);
    else
        remove(ignoreList, index);
}
/**
 * Returns a sourcemap object (with decoded mappings) suitable for passing to a library that expects
 * a sourcemap, or to JSON.stringify.
 */
function toDecodedMap(map) {
    const { _mappings: mappings, _sources: sources, _sourcesContent: sourcesContent, _names: names, _ignoreList: ignoreList, } = cast(map);
    removeEmptyFinalLines(mappings);
    return {
        version: 3,
        file: map.file || undefined,
        names: names.array,
        sourceRoot: map.sourceRoot || undefined,
        sources: sources.array,
        sourcesContent,
        mappings,
        ignoreList: ignoreList.array,
    };
}
/**
 * Returns a sourcemap object (with encoded mappings) suitable for passing to a library that expects
 * a sourcemap, or to JSON.stringify.
 */
function toEncodedMap(map) {
    const decoded = toDecodedMap(map);
    return Object.assign(Object.assign({}, decoded), { mappings: encode(decoded.mappings) });
}
// This split declaration is only so that terser can elminiate the static initialization block.
function addSegmentInternal(skipable, map, genLine, genColumn, source, sourceLine, sourceColumn, name, content) {
    const { _mappings: mappings, _sources: sources, _sourcesContent: sourcesContent, _names: names, } = cast(map);
    const line = getLine(mappings, genLine);
    const index = getColumnIndex(line, genColumn);
    if (!source) {
        if (skipSourceless(line, index))
            return;
        return insert(line, index, [genColumn]);
    }
    const sourcesIndex = put(sources, source);
    const namesIndex = name ? put(names, name) : NO_NAME;
    if (sourcesIndex === sourcesContent.length)
        sourcesContent[sourcesIndex] = null;
    if (skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex)) {
        return;
    }
    return insert(line, index, name
        ? [genColumn, sourcesIndex, sourceLine, sourceColumn, namesIndex]
        : [genColumn, sourcesIndex, sourceLine, sourceColumn]);
}
function getLine(mappings, index) {
    for (let i = mappings.length; i <= index; i++) {
        mappings[i] = [];
    }
    return mappings[index];
}
function getColumnIndex(line, genColumn) {
    let index = line.length;
    for (let i = index - 1; i >= 0; index = i--) {
        const current = line[i];
        if (genColumn >= current[COLUMN])
            break;
    }
    return index;
}
function insert(array, index, value) {
    for (let i = array.length; i > index; i--) {
        array[i] = array[i - 1];
    }
    array[index] = value;
}
function removeEmptyFinalLines(mappings) {
    const { length } = mappings;
    let len = length;
    for (let i = len - 1; i >= 0; len = i, i--) {
        if (mappings[i].length > 0)
            break;
    }
    if (len < length)
        mappings.length = len;
}
function skipSourceless(line, index) {
    // The start of a line is already sourceless, so adding a sourceless segment to the beginning
    // doesn't generate any useful information.
    if (index === 0)
        return true;
    const prev = line[index - 1];
    // If the previous segment is also sourceless, then adding another sourceless segment doesn't
    // genrate any new information. Else, this segment will end the source/named segment and point to
    // a sourceless position, which is useful.
    return prev.length === 1;
}
function skipSource(line, index, sourcesIndex, sourceLine, sourceColumn, namesIndex) {
    // A source/named segment at the start of a line gives position at that genColumn
    if (index === 0)
        return false;
    const prev = line[index - 1];
    // If the previous segment is sourceless, then we're transitioning to a source.
    if (prev.length === 1)
        return false;
    // If the previous segment maps to the exact same source position, then this segment doesn't
    // provide any new position information.
    return (sourcesIndex === prev[SOURCES_INDEX] &&
        sourceLine === prev[SOURCE_LINE] &&
        sourceColumn === prev[SOURCE_COLUMN] &&
        namesIndex === (prev.length === 5 ? prev[NAMES_INDEX] : NO_NAME));
}

const SOURCELESS_MAPPING = /* #__PURE__ */ SegmentObject('', -1, -1, '', null, false);
const EMPTY_SOURCES = [];
function SegmentObject(source, line, column, name, content, ignore) {
    return { source, line, column, name, content, ignore };
}
function Source(map, sources, source, content, ignore) {
    return {
        map,
        sources,
        source,
        content,
        ignore,
    };
}
/**
 * MapSource represents a single sourcemap, with the ability to trace mappings into its child nodes
 * (which may themselves be SourceMapTrees).
 */
function MapSource(map, sources) {
    return Source(map, sources, '', null, false);
}
/**
 * A "leaf" node in the sourcemap tree, representing an original, unmodified source file. Recursive
 * segment tracing ends at the `OriginalSource`.
 */
function OriginalSource(source, content, ignore) {
    return Source(null, EMPTY_SOURCES, source, content, ignore);
}
/**
 * traceMappings is only called on the root level SourceMapTree, and begins the process of
 * resolving each mapping in terms of the original source files.
 */
function traceMappings(tree) {
    // TODO: Eventually support sourceRoot, which has to be removed because the sources are already
    // fully resolved. We'll need to make sources relative to the sourceRoot before adding them.
    const gen = new GenMapping({ file: tree.map.file });
    const { sources: rootSources, map } = tree;
    const rootNames = map.names;
    const rootMappings = decodedMappings(map);
    for (let i = 0; i < rootMappings.length; i++) {
        const segments = rootMappings[i];
        for (let j = 0; j < segments.length; j++) {
            const segment = segments[j];
            const genCol = segment[0];
            let traced = SOURCELESS_MAPPING;
            // 1-length segments only move the current generated column, there's no source information
            // to gather from it.
            if (segment.length !== 1) {
                const source = rootSources[segment[1]];
                traced = originalPositionFor(source, segment[2], segment[3], segment.length === 5 ? rootNames[segment[4]] : '');
                // If the trace is invalid, then the trace ran into a sourcemap that doesn't contain a
                // respective segment into an original source.
                if (traced == null)
                    continue;
            }
            const { column, line, name, content, source, ignore } = traced;
            maybeAddSegment(gen, i, genCol, source, line, column, name);
            if (source && content != null)
                setSourceContent(gen, source, content);
            if (ignore)
                setIgnore(gen, source, true);
        }
    }
    return gen;
}
/**
 * originalPositionFor is only called on children SourceMapTrees. It recurses down into its own
 * child SourceMapTrees, until we find the original source map.
 */
function originalPositionFor(source, line, column, name) {
    if (!source.map) {
        return SegmentObject(source.source, line, column, name, source.content, source.ignore);
    }
    const segment = traceSegment(source.map, line, column);
    // If we couldn't find a segment, then this doesn't exist in the sourcemap.
    if (segment == null)
        return null;
    // 1-length segments only move the current generated column, there's no source information
    // to gather from it.
    if (segment.length === 1)
        return SOURCELESS_MAPPING;
    return originalPositionFor(source.sources[segment[1]], segment[2], segment[3], segment.length === 5 ? source.map.names[segment[4]] : name);
}

function asArray(value) {
    if (Array.isArray(value))
        return value;
    return [value];
}
/**
 * Recursively builds a tree structure out of sourcemap files, with each node
 * being either an `OriginalSource` "leaf" or a `SourceMapTree` composed of
 * `OriginalSource`s and `SourceMapTree`s.
 *
 * Every sourcemap is composed of a collection of source files and mappings
 * into locations of those source files. When we generate a `SourceMapTree` for
 * the sourcemap, we attempt to load each source file's own sourcemap. If it
 * does not have an associated sourcemap, it is considered an original,
 * unmodified source file.
 */
function buildSourceMapTree(input, loader) {
    const maps = asArray(input).map((m) => new TraceMap(m, ''));
    const map = maps.pop();
    for (let i = 0; i < maps.length; i++) {
        if (maps[i].sources.length > 1) {
            throw new Error(`Transformation map ${i} must have exactly one source file.\n` +
                'Did you specify these with the most recent transformation maps first?');
        }
    }
    let tree = build(map, loader, '', 0);
    for (let i = maps.length - 1; i >= 0; i--) {
        tree = MapSource(maps[i], [tree]);
    }
    return tree;
}
function build(map, loader, importer, importerDepth) {
    const { resolvedSources, sourcesContent, ignoreList } = map;
    const depth = importerDepth + 1;
    const children = resolvedSources.map((sourceFile, i) => {
        // The loading context gives the loader more information about why this file is being loaded
        // (eg, from which importer). It also allows the loader to override the location of the loaded
        // sourcemap/original source, or to override the content in the sourcesContent field if it's
        // an unmodified source file.
        const ctx = {
            importer,
            depth,
            source: sourceFile || '',
            content: undefined,
            ignore: undefined,
        };
        // Use the provided loader callback to retrieve the file's sourcemap.
        // TODO: We should eventually support async loading of sourcemap files.
        const sourceMap = loader(ctx.source, ctx);
        const { source, content, ignore } = ctx;
        // If there is a sourcemap, then we need to recurse into it to load its source files.
        if (sourceMap)
            return build(new TraceMap(sourceMap, source), loader, source, depth);
        // Else, it's an unmodified source file.
        // The contents of this unmodified source file can be overridden via the loader context,
        // allowing it to be explicitly null or a string. If it remains undefined, we fall back to
        // the importing sourcemap's `sourcesContent` field.
        const sourceContent = content !== undefined ? content : sourcesContent ? sourcesContent[i] : null;
        const ignored = ignore !== undefined ? ignore : ignoreList ? ignoreList.includes(i) : false;
        return OriginalSource(source, sourceContent, ignored);
    });
    return MapSource(map, children);
}

/**
 * A SourceMap v3 compatible sourcemap, which only includes fields that were
 * provided to it.
 */
class SourceMap {
    constructor(map, options) {
        const out = options.decodedMappings ? toDecodedMap(map) : toEncodedMap(map);
        this.version = out.version; // SourceMap spec says this should be first.
        this.file = out.file;
        this.mappings = out.mappings;
        this.names = out.names;
        this.ignoreList = out.ignoreList;
        this.sourceRoot = out.sourceRoot;
        this.sources = out.sources;
        if (!options.excludeContent) {
            this.sourcesContent = out.sourcesContent;
        }
    }
    toString() {
        return JSON.stringify(this);
    }
}

/**
 * Traces through all the mappings in the root sourcemap, through the sources
 * (and their sourcemaps), all the way back to the original source location.
 *
 * `loader` will be called every time we encounter a source file. If it returns
 * a sourcemap, we will recurse into that sourcemap to continue the trace. If
 * it returns a falsey value, that source file is treated as an original,
 * unmodified source file.
 *
 * Pass `excludeContent` to exclude any self-containing source file content
 * from the output sourcemap.
 *
 * Pass `decodedMappings` to receive a SourceMap with decoded (instead of
 * VLQ encoded) mappings.
 */
function remapping(input, loader, options) {
    const opts = { excludeContent: !!options, decodedMappings: false };
    const tree = buildSourceMapTree(input, loader);
    return new SourceMap(traceMappings(tree), opts);
}

const applyTransformersSync = (filePath, code, transformers) => {
  const maps = [];
  const result = { code };
  for (const transformer of transformers) {
    const transformed = transformer(filePath, result.code);
    if (transformed) {
      Object.assign(result, transformed);
      maps.unshift(transformed.map);
    }
  }
  return {
    ...result,
    map: remapping(maps, () => null)
  };
};
const applyTransformers = async (filePath, code, transformers) => {
  const maps = [];
  const result = { code };
  for (const transformer of transformers) {
    const transformed = await transformer(filePath, result.code);
    if (transformed) {
      Object.assign(result, transformed);
      maps.unshift(transformed.map);
    }
  }
  return {
    ...result,
    map: remapping(maps, () => null)
  };
};

const baseConfig = Object.freeze({
  target: `node${process.versions.node}`,
  // "default" tells esbuild to infer loader from file name
  // https://github.com/evanw/esbuild/blob/4a07b17adad23e40cbca7d2f8931e8fb81b47c33/internal/bundler/bundler.go#L158
  loader: "default"
});
const cacheConfig = {
  ...baseConfig,
  sourcemap: true,
  /**
   * Improve performance by only generating sourcesContent
   * when V8 coverage is enabled
   *
   * https://esbuild.github.io/api/#sources-content
   */
  sourcesContent: Boolean(process.env.NODE_V8_COVERAGE),
  /**
   * Smaller output for cache and marginal performance improvement:
   * https://twitter.com/evanwallace/status/1396336348366180359?s=20
   *
   * minifyIdentifiers is disabled because debuggers don't use the
   * `names` property from the source map
   *
   * minifySyntax is disabled because it does some tree-shaking
   * eg. unused try-catch error variable
   */
  minifyWhitespace: true,
  /**
   * esbuild renames variables even if minification is not enabled
   * https://esbuild.github.io/try/#dAAwLjE5LjUAAGNvbnN0IGEgPSAxOwooZnVuY3Rpb24gYSgpIHt9KTs
   */
  keepNames: true
};
const patchOptions = (options) => {
  const originalSourcefile = options.sourcefile;
  if (originalSourcefile) {
    const extension = path.extname(originalSourcefile.split("?")[0]);
    if (extension) {
      if (extension === ".cts" || extension === ".mts") {
        options.sourcefile = `${originalSourcefile.slice(0, -3)}ts`;
      } else if (extension === ".mjs") {
        options.sourcefile = `${originalSourcefile.slice(0, -3)}js`;
      }
    } else {
      options.sourcefile += ".js";
    }
  }
  return (result) => {
    if (result.map) {
      if (options.sourcefile !== originalSourcefile) {
        result.map = result.map.replace(
          JSON.stringify(options.sourcefile),
          JSON.stringify(originalSourcefile)
        );
      }
      result.map = JSON.parse(result.map);
    }
    return result;
  };
};

const formatEsbuildError = (error) => {
  error.name = "TransformError";
  delete error.errors;
  delete error.warnings;
  throw error;
};
const transformSync = (code, filePath, extendOptions) => {
  const [filePathWithoutQuery, query] = filePath.split("?");
  const define = {};
  if (!(filePathWithoutQuery.endsWith(".cjs") || filePathWithoutQuery.endsWith(".cts"))) {
    define["import.meta.url"] = JSON.stringify(node_url.pathToFileURL(filePathWithoutQuery) + (query ? `?${query}` : ""));
  }
  const esbuildOptions = {
    ...cacheConfig,
    format: "cjs",
    sourcefile: filePathWithoutQuery,
    define,
    banner: "(()=>{",
    footer: "})()",
    // CJS Annotations for Node. Used by ESM loader for CJS interop
    platform: "node",
    ...extendOptions
  };
  const hash = sha1([
    code,
    JSON.stringify(esbuildOptions),
    esbuild.version,
    version
  ].join("-"));
  let transformed = cache.get(hash);
  if (!transformed) {
    transformed = applyTransformersSync(
      filePath,
      code,
      [
        (_filePath, _code) => {
          const patchResult = patchOptions(esbuildOptions);
          let result;
          try {
            result = esbuild.transformSync(_code, esbuildOptions);
          } catch (error) {
            throw formatEsbuildError(error);
          }
          return patchResult(result);
        },
        (_filePath, _code) => transformDynamicImport(_filePath, _code, true)
      ]
    );
    cache.set(hash, transformed);
  }
  return transformed;
};
const transform = async (code, filePath, extendOptions) => {
  const esbuildOptions = {
    ...cacheConfig,
    format: "esm",
    sourcefile: filePath,
    ...extendOptions
  };
  const hash = sha1([
    code,
    JSON.stringify(esbuildOptions),
    esbuild.version,
    version
  ].join("-"));
  let transformed = cache.get(hash);
  if (!transformed) {
    transformed = await applyTransformers(
      filePath,
      code,
      [
        async (_filePath, _code) => {
          const patchResult = patchOptions(esbuildOptions);
          let result;
          try {
            result = await esbuild.transform(_code, esbuildOptions);
          } catch (error) {
            throw formatEsbuildError(error);
          }
          return patchResult(result);
        },
        (_filePath, _code) => transformDynamicImport(_filePath, _code, true)
      ]
    );
    cache.set(hash, transformed);
  }
  return transformed;
};

exports.isESM = isESM;
exports.readJsonFile = readJsonFile;
exports.transform = transform;
exports.transformDynamicImport = transformDynamicImport;
exports.transformSync = transformSync;
