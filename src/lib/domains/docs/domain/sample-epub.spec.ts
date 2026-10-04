import { describe, expect, it } from 'vitest';
import { FIRST_EDITION, PACKAGE_PATH, SAMPLE_SENTENCE, sampleEpubEntries } from './sample-epub';
import type { SampleBook } from './sample-epub';

function files(book: SampleBook): Map<string, string> {
  const decoder = new TextDecoder();
  return new Map(sampleEpubEntries(book).map((entry) => [entry.path, decoder.decode(entry.bytes)]));
}

function spine(book: SampleBook): readonly string[] {
  const opf = files(book).get(PACKAGE_PATH) ?? '';
  return [...opf.matchAll(/<itemref idref="([^"]+)"/gu)].map((found) => found[1] ?? '');
}

describe('sampleEpubEntries', () => {
  it('puts the mimetype entry first', () => {
    const [first] = sampleEpubEntries(FIRST_EDITION);

    expect(first?.path).toBe('mimetype');
    expect(new TextDecoder().decode(first?.bytes)).toBe('application/epub+zip');
  });

  it('points the container at the package document', () => {
    expect(files(FIRST_EDITION).get('META-INF/container.xml')).toContain(
      `full-path="${PACKAGE_PATH}"`,
    );
  });

  it('pages a vertical book right to left and sets its writing mode in the stylesheet', () => {
    const book = files(FIRST_EDITION);

    expect(book.get(PACKAGE_PATH)).toContain('page-progression-direction="rtl"');
    expect(book.get('OEBPS/style.css')).toContain('writing-mode: vertical-rl');
  });

  it('pages a horizontal book left to right with no writing mode', () => {
    const book = files({ writingMode: 'horizontal', edition: 'first' });

    expect(book.get(PACKAGE_PATH)).toContain('page-progression-direction="ltr"');
    expect(book.get('OEBPS/style.css')).not.toContain('writing-mode');
  });

  it('adds a foreword at the start of the spine in the foreword edition', () => {
    expect(spine(FIRST_EDITION)).toEqual(['ch1', 'ch2', 'ch3']);
    expect(spine({ ...FIRST_EDITION, edition: 'foreword' })).toEqual([
      'foreword',
      'ch1',
      'ch2',
      'ch3',
    ]);
  });

  it('keeps the sample sentence in the second chapter of every edition', () => {
    for (const edition of [
      'first',
      'foreword',
      'inserted-paragraph',
      'edited-sentence',
      'restructured',
    ] as const) {
      expect(files({ ...FIRST_EDITION, edition }).get('OEBPS/ch2.xhtml')).toContain(
        SAMPLE_SENTENCE,
      );
    }
  });

  it('wraps the paragraphs in a section only in the restructured edition', () => {
    expect(files(FIRST_EDITION).get('OEBPS/ch2.xhtml')).not.toContain('<section>');
    expect(files({ ...FIRST_EDITION, edition: 'restructured' }).get('OEBPS/ch2.xhtml')).toContain(
      '<body><h2>探している本</h2><section><p>',
    );
  });

  it('lengthens the sentence before the sample in the edited-sentence edition', () => {
    const edited = files({ ...FIRST_EDITION, edition: 'edited-sentence' }).get('OEBPS/ch2.xhtml');

    expect(edited).toContain(`灯台と、海と、手紙。${SAMPLE_SENTENCE}`);
    expect(files(FIRST_EDITION).get('OEBPS/ch2.xhtml')).toContain(`灯台と手紙。${SAMPLE_SENTENCE}`);
  });

  it('adds one paragraph before the others in the inserted-paragraph edition', () => {
    const count = (book: SampleBook): number =>
      (files(book).get('OEBPS/ch2.xhtml') ?? '').split('<p>').length - 1;

    expect(count({ ...FIRST_EDITION, edition: 'inserted-paragraph' })).toBe(
      count(FIRST_EDITION) + 1,
    );
  });
});
