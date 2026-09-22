import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import { capturedLabel, firstImage, NO_PLACE, placeLabel } from './capture-place';

const NOW = 1_700_000_000_000;

const QUOTED: Anchor = textAnchor('epubcfi(/6/14!/4/2/6,/1:0,/1:5)', {
  exact: 'こっちに来て',
  prefix: 'そして',
  suffix: 'と言った',
});

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

  it('reports no page for a capture anchored to text', () => {
    expect(placeLabel(QUOTED)).toBe(NO_PLACE);
  });

  it('reports no page for a capture anchored to no region at all', () => {
    expect(placeLabel(regionAnchor([]))).toBe(NO_PLACE);
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
