import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor, TextAnchor, TextQuote } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import {
  capturedLabel,
  cardChapter,
  firstImage,
  GO_TO_PASSAGE,
  NO_CHAPTER,
  NO_PLACE,
  passageLabel,
  placeLabel,
  placeLanguage,
} from './capture-place';

const NOW = 1_700_000_000_000;

const QUOTED_CFI = 'epubcfi(/6/14!/4/2/6,/1:0,/1:5)';

const QUOTE: TextQuote = { exact: 'こっちに来て', prefix: 'そして', suffix: 'と言った' };

const QUOTED: Anchor = textAnchor(QUOTED_CFI, QUOTE, null);

function on(index: number) {
  return { index: imageIndex(index), rect: imageRect(0, 0, 100, 60) };
}

describe('placeLabel', () => {
  it('names the page a single region sits on', () => {
    expect(placeLabel(regionAnchor([on(13)]))).toBe('p.014');
  });

  it('counts the regions of a capture spanning a spread', () => {
    expect(placeLabel(regionAnchor([on(13), on(14)]))).toBe('p.014–015 · 2 regions');
  });

  it('names the chapter a capture anchored to text was lifted from', () => {
    expect(placeLabel(textAnchor(QUOTED_CFI, QUOTE, '第三章　海辺'))).toBe('第三章　海辺');
  });

  it('reports no chapter for a capture anchored to text in no chapter', () => {
    expect(placeLabel(QUOTED)).toBe(NO_CHAPTER);
  });

  it('reports no page for a capture anchored to no region at all', () => {
    expect(placeLabel(regionAnchor([]))).toBe(NO_PLACE);
  });
});

describe('placeLanguage', () => {
  it('gives a chapter title the language of its book', () => {
    expect(placeLanguage(textAnchor(QUOTED_CFI, QUOTE, '第三章　海辺'), 'ja')).toBe('ja');
  });

  it('gives a page place no language, since the interface wrote it', () => {
    expect(placeLanguage(regionAnchor([on(13)]), 'ja')).toBeNull();
    expect(placeLanguage(regionAnchor([]), 'ja')).toBeNull();
  });

  it('gives a passage in no chapter no language, since the interface wrote its label', () => {
    expect(placeLanguage(QUOTED, 'ja')).toBeNull();
  });

  it('gives a chapter title no language when the book language is unknown', () => {
    expect(placeLanguage(textAnchor(QUOTED_CFI, QUOTE, '第三章'), null)).toBeNull();
  });
});

describe('passageLabel', () => {
  const passage: TextAnchor = { kind: 'text', cfi: QUOTED_CFI, quote: QUOTE, chapter: '제1장' };

  it('shows the chapter title of the passage', () => {
    expect(passageLabel(passage)).toBe('제1장');
  });

  it('falls back to no chapter when the passage names none', () => {
    expect(passageLabel({ ...passage, chapter: null })).toBe('no chapter');
  });
});

describe('cardChapter', () => {
  const passage: TextAnchor = {
    kind: 'text',
    cfi: QUOTED_CFI,
    quote: QUOTE,
    chapter: '第三章　海辺',
  };

  it('names the chapter in the language of its book', () => {
    expect(cardChapter(passage, 'ja')).toEqual({ text: '第三章　海辺', lang: 'ja' });
  });

  it('gives no chapter when the passage names none, or when the capture sits on an image', () => {
    expect([
      cardChapter({ ...passage, chapter: null }, 'ja'),
      cardChapter(regionAnchor([on(4)]), 'ja'),
    ]).toEqual([null, null]);
  });

  it('reads Go to passage on the button that seeks a passage', () => {
    expect(GO_TO_PASSAGE).toBe('Go to passage');
  });
});

describe('firstImage', () => {
  it('names the image the first region sits on', () => {
    expect(firstImage(regionAnchor([on(4), on(5)]))).toBe(4);
  });

  it('names no image for a capture anchored to text', () => {
    expect(firstImage(QUOTED)).toBeNull();
  });

  it('names no image for a capture anchored to no region at all', () => {
    expect(firstImage(regionAnchor([]))).toBeNull();
  });
});

describe('capturedLabel', () => {
  it('says nothing for a capture stored before a time was kept', () => {
    expect(capturedLabel(0, NOW)).toBeNull();
  });

  it('reports the last minute as just now', () => {
    expect(capturedLabel(NOW - 30_000, NOW)).toBe('captured just now');
  });

  it('reports minutes within the hour', () => {
    expect(capturedLabel(NOW - 5 * 60_000, NOW)).toBe('captured 5 min ago');
  });

  it('keeps the hour singular at one hour', () => {
    expect(capturedLabel(NOW - 3_600_000, NOW)).toBe('captured 1 hour ago');
  });

  it('reports days beyond the first', () => {
    expect(capturedLabel(NOW - 2 * 86_400_000, NOW)).toBe('captured 2 days ago');
  });

  it('never reports a time ahead of now', () => {
    expect(capturedLabel(NOW + 86_400_000, NOW)).toBe('captured just now');
  });
});
