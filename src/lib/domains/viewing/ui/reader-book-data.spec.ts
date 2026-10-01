import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import { FLOWING_TEXT_NOTICE } from './flow-notice';
import type { ReaderBook, ReaderOpening, ShownOpening } from './reader-opening';
import ReaderBookData from './ReaderBookData.svelte';

const DATA = ReaderBookData as unknown as Component<Record<string, unknown>>;

const BOOK: ReaderBook = {
  id: bookId('one'),
  title: 'Blame!',
  language: 'ja',
  layoutKind: 'paged',
  direction: 'rtl',
  pagePairing: 'double',
  pageFit: 'height',
  sourceKind: 'archive',
  contentHash: contentHash('a1'),
  fileName: 'book.cbz',
  imageCount: 6,
  addedAt: 1,
  position: imagePlace(imageIndex(0)),
  lastReadAt: null,
  finishedAt: null,
};

const READING = createRawSnippet((shown: () => ShownOpening) => ({
  render: () => `<p>reading ${shown().book.title}</p>`,
}));

const BACK = 'Back to your library';

function markup(opening: ReaderOpening): string {
  return render(DATA, { props: { opening, children: READING } }).body;
}

describe('ReaderBookData', () => {
  it('hands the child the book of images once it is open', () => {
    const html = markup({ kind: 'images', book: BOOK, notice: null });

    expect(html).toContain('<p>reading Blame!</p>');
    expect(html).not.toContain('Opening the book…');
  });

  it('draws the opening curtain in place of the child until the book is open', () => {
    for (const opening of [
      { kind: 'idle' },
      { kind: 'opening' },
      { kind: 'missing', message: 'gone' },
    ] as const) {
      const html = markup(opening);

      expect(html).toContain('Opening the book…');
      expect(html).not.toContain('reading');
      expect(html).not.toContain(BACK);
    }
  });

  it('draws the failure with a way back to the library', () => {
    const html = markup({ kind: 'failed', message: 'That book could not be read: bad zip' });

    expect(html).toContain('That book could not be read: bad zip');
    expect(html).toContain(BACK);
    expect(html).not.toContain('reading');
  });

  it('draws the empty book notice without a way back', () => {
    const html = markup({ kind: 'empty', book: BOOK });

    expect(html).toContain('This book holds no pages to show.');
    expect(html).not.toContain(BACK);
    expect(html).not.toContain('reading');
  });

  it('draws the flowing text notice for an ebook', () => {
    const html = markup({ kind: 'flow', book: { ...BOOK, layoutKind: 'flow', imageCount: 0 } });

    expect(html).toContain(FLOWING_TEXT_NOTICE);
    expect(html).not.toContain('reading');
  });
});
