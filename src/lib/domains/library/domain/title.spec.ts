import { describe, expect, it } from 'vitest';
import { suggestTitle } from './title';

describe('suggestTitle', () => {
	it('falls back for an empty list', () => {
		expect(suggestTitle([])).toBe('Untitled');
	});

	it('names a single loose file after itself, without its extension', () => {
		expect(suggestTitle([{ name: 'Volume One.cbz', path: '' }])).toBe('Volume One');
	});

	it('names a single file inside a folder after the folder', () => {
		expect(suggestTitle([{ name: 'page1.jpg', path: 'My Manga/page1.jpg' }])).toBe('My Manga');
	});

	it('names a folder of files after the folder', () => {
		expect(
			suggestTitle([
				{ name: 'page1.jpg', path: 'My Manga/page1.jpg' },
				{ name: 'page2.jpg', path: 'My Manga/page2.jpg' }
			])
		).toBe('My Manga');
	});

	it('names several loose files after the first of them', () => {
		expect(
			suggestTitle([
				{ name: 'page1.jpg', path: '' },
				{ name: 'page2.jpg', path: '' }
			])
		).toBe('page1');
	});

	it('takes only the first segment of a deeply nested path', () => {
		expect(suggestTitle([{ name: 'page1.jpg', path: 'My Manga/vol1/ch2/page1.jpg' }])).toBe(
			'My Manga'
		);
	});

	it('falls back when the name holds nothing but whitespace', () => {
		expect(suggestTitle([{ name: '   ', path: '' }])).toBe('Untitled');
	});

	it('skips a folder segment that holds nothing but whitespace', () => {
		expect(suggestTitle([{ name: 'page1.jpg', path: '   /page1.jpg' }])).toBe('page1');
	});

	it('keeps a name that is only an extension', () => {
		expect(suggestTitle([{ name: '.gitignore', path: '' }])).toBe('.gitignore');
	});
});
