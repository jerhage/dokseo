import { describe, expect, it } from 'vitest';
import { basename, extensionOf, withoutExtension } from './entry-path';

describe('entry path helpers', () => {
	it('reads a plain name', () => {
		expect(basename('page1.jpg')).toBe('page1.jpg');
		expect(extensionOf('page1.jpg')).toBe('jpg');
		expect(withoutExtension('page1.jpg')).toBe('page1');
	});

	it('reads the last segment of a nested path', () => {
		expect(basename('vol1/ch2/page1.jpg')).toBe('page1.jpg');
		expect(extensionOf('vol1/ch2/page1.jpg')).toBe('jpg');
		expect(withoutExtension('vol1/ch2/page1.jpg')).toBe('page1');
	});

	it('leaves a name with no extension whole', () => {
		expect(basename('cover')).toBe('cover');
		expect(extensionOf('cover')).toBe('');
		expect(withoutExtension('cover')).toBe('cover');
	});

	it('treats a leading dot as part of the name, not as an extension', () => {
		expect(basename('.DS_Store')).toBe('.DS_Store');
		expect(extensionOf('.DS_Store')).toBe('');
		expect(withoutExtension('.DS_Store')).toBe('.DS_Store');
	});

	it('lowercases the extension', () => {
		expect(extensionOf('PHOTO.JPG')).toBe('jpg');
		expect(withoutExtension('PHOTO.JPG')).toBe('PHOTO');
	});

	it('takes only the part after the last dot of a name with several dots', () => {
		expect(extensionOf('archive.tar.gz')).toBe('gz');
		expect(withoutExtension('archive.tar.gz')).toBe('archive.tar');
	});

	it('reads a trailing dot as an empty extension', () => {
		expect(extensionOf('weird.')).toBe('');
		expect(withoutExtension('weird.')).toBe('weird');
	});

	it('handles an empty string', () => {
		expect(basename('')).toBe('');
		expect(extensionOf('')).toBe('');
		expect(withoutExtension('')).toBe('');
	});

	it('ignores a dot that belongs to a directory', () => {
		expect(basename('chapter.txt/page1')).toBe('page1');
		expect(extensionOf('chapter.txt/page1')).toBe('');
		expect(withoutExtension('chapter.txt/page1')).toBe('page1');
	});
});
