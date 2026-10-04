import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Container } from '$lib/container';
import { bookId, contentHash, imageIndex } from '$lib/shared/ids';
import { imagePlace } from '$lib/shared/reading-place';
import type { ReaderBook, ReaderOpening } from './reader-opening';
import { ReaderView } from './reader-view.svelte';
import ReaderScreen from './ReaderScreen.svelte';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/idle-write-query'));

const SCREEN = ReaderScreen as unknown as Component<Record<string, unknown>>;

const BOOK: ReaderBook = {
  id: bookId('one'),
  title: 'Blame!',
  alias: null,
  seriesId: null,
  volume: null,
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
  it.each([
    { layoutKind: 'paged', shown: 'paged-viewer', absent: 'continuous-viewer' },
    { layoutKind: 'continuous', shown: 'continuous-viewer', absent: 'paged-viewer' },
  ] as const)('shows a $layoutKind book in the $shown', ({ layoutKind, shown, absent }) => {
    const html = markup({ kind: 'images', book: { ...BOOK, layoutKind }, notice: null });

    expect(html).toContain(shown);
    expect(html).not.toContain(absent);
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

  it('keeps the frame, with the book unnamed, while the book opens', () => {
    const html = markup({ kind: 'opening' });

    expect(html).toContain('Opening the book…');
    expect(html).toContain('Reader');
    expect(html).not.toContain('viewer');
  });
});
