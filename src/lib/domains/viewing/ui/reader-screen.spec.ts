import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { ReaderBook, ReaderOpening } from './reader-opening';
import { ReaderView } from './reader-view.svelte';
import ReaderScreen from './ReaderScreen.svelte';

const SCREEN = ReaderScreen as unknown as Component<Record<string, unknown>>;

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

function markup(opening: ReaderOpening): string {
  const view = new ReaderView({} as Container, () => undefined);
  view.opening = opening;
  view.grouping.groups = [[imageIndex(0), imageIndex(1)]];
  return render(SCREEN, { props: { view } }).body;
}

beforeEach(() => {
  vi.stubGlobal('document', { documentElement: { getAttribute: () => null, dataset: {} } });
  vi.stubGlobal('window', {
    matchMedia: () => ({
      matches: false,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReaderScreen', () => {
  it('shows a paged book in the paged viewer', () => {
    const html = markup({ kind: 'images', book: BOOK, notice: null });

    expect(html).toContain('paged-viewer');
    expect(html).not.toContain('continuous-viewer');
  });

  it('lays the pages out in the reading direction of the book', () => {
    const rightToLeft = markup({ kind: 'images', book: BOOK, notice: null });
    const leftToRight = markup({
      kind: 'images',
      book: { ...BOOK, direction: 'ltr' },
      notice: null,
    });

    expect(rightToLeft).toContain('is-rtl');
    expect(leftToRight).not.toContain('is-rtl');
  });

  it('shows a continuous book in the strip viewer', () => {
    const html = markup({
      kind: 'images',
      book: { ...BOOK, layoutKind: 'continuous' },
      notice: null,
    });

    expect(html).toContain('continuous-viewer');
    expect(html).not.toContain('paged-viewer');
  });

  it('keeps the frame, with the book unnamed, while the book opens', () => {
    const html = markup({ kind: 'opening' });

    expect(html).toContain('Opening the book…');
    expect(html).toContain('Reader');
    expect(html).not.toContain('viewer');
  });
});
