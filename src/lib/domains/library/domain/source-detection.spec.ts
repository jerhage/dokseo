import { describe, expect, it } from 'vitest';
import { detectSourceKind } from './source-detection';

describe('detectSourceKind', () => {
	it('detects a single pdf', () => {
		expect(detectSourceKind(['chapter.pdf'])).toBe('pdf');
	});

	it('detects a single zip', () => {
		expect(detectSourceKind(['chapter.zip'])).toBe('archive');
	});

	it('detects a single cbz', () => {
		expect(detectSourceKind(['chapter.cbz'])).toBe('archive');
	});

	it('ignores the case of the container extension', () => {
		expect(detectSourceKind(['chapter.PDF'])).toBe('pdf');
		expect(detectSourceKind(['chapter.ZiP'])).toBe('archive');
		expect(detectSourceKind(['chapter.CBZ'])).toBe('archive');
	});

	it('judges the extension of the basename, not of a folder', () => {
		expect(detectSourceKind(['vol1.pdf/chapter.pdf'])).toBe('pdf');
		expect(detectSourceKind(['vol1.pdf/notes.txt'])).toBe(null);
	});

	it('falls to images when a pdf arrives alongside an image', () => {
		expect(detectSourceKind(['chapter.pdf', 'page1.jpg'])).toBe('images');
	});

	it('falls to images when an archive arrives alongside an image', () => {
		expect(detectSourceKind(['chapter.cbz', 'page1.png'])).toBe('images');
	});

	it('returns null for two pdfs, because neither the single-container nor the image rule matches', () => {
		expect(detectSourceKind(['one.pdf', 'two.pdf'])).toBe(null);
	});

	it('returns null for two archives, for the same reason', () => {
		expect(detectSourceKind(['one.zip', 'two.cbz'])).toBe(null);
	});

	it('detects loose images', () => {
		expect(detectSourceKind(['page1.jpg', 'page2.png', 'page3.webp'])).toBe('images');
	});

	it('detects a single loose image', () => {
		expect(detectSourceKind(['cover.jpg'])).toBe('images');
	});

	it('detects a dropped folder of images by its relative paths', () => {
		expect(detectSourceKind(['vol1/page1.jpg', 'vol1/page2.jpg'])).toBe('images');
	});

	it('detects images when only one entry of many is an image', () => {
		expect(detectSourceKind(['ComicInfo.xml', 'notes.txt', 'vol1/page1.jpg'])).toBe('images');
	});

	it('returns null when nothing is usable', () => {
		expect(detectSourceKind(['notes.txt', 'ComicInfo.xml'])).toBe(null);
	});

	it('returns null for an empty list', () => {
		expect(detectSourceKind([])).toBe(null);
	});

	it('returns null for a name with no extension', () => {
		expect(detectSourceKind(['chapter'])).toBe(null);
		expect(detectSourceKind(['vol1/chapter'])).toBe(null);
	});

	it('returns null for a dotfile whose whole name looks like an extension', () => {
		expect(detectSourceKind(['.pdf'])).toBe(null);
		expect(detectSourceKind(['.cbz'])).toBe(null);
		expect(detectSourceKind(['.jpg'])).toBe(null);
	});

	it('returns null for an empty name', () => {
		expect(detectSourceKind([''])).toBe(null);
	});

	it('does not treat a rar or a 7z as an archive', () => {
		expect(detectSourceKind(['chapter.cbr'])).toBe(null);
		expect(detectSourceKind(['chapter.7z'])).toBe(null);
	});

	it('does not treat a directory entry as a container', () => {
		expect(detectSourceKind(['chapter.zip/'])).toBe(null);
	});
});
