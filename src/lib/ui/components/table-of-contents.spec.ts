import { describe, expect, it } from 'vitest';
import {
  READING_LINE_SHARE,
  anchorSlug,
  contentsEntries,
  currentHeading,
  readingLine,
  scrolledToEnd,
} from './table-of-contents';
import type { HeadingPlace, ReadingView } from './table-of-contents';

describe('anchorSlug', () => {
  it.each([
    ['Why SharedArrayBuffer needs isolation', 'why-sharedarraybuffer-needs-isolation'],
    ['  COOP & COEP: the pair  ', 'coop-coep-the-pair'],
    ['Café crème', 'cafe-creme'],
    ['縦書き rendering', '縦書き-rendering'],
  ])('turns %j into %j', (title, slug) => {
    expect(anchorSlug(title)).toBe(slug);
  });

  it('returns nothing for a title of punctuation alone', () => {
    expect(anchorSlug('— ? —')).toBe('');
  });
});

describe('contentsEntries', () => {
  it('links each heading to the anchor its title makes, at level 2 by default', () => {
    expect(contentsEntries([{ title: 'The headers' }, { title: 'In use', level: 3 }])).toEqual([
      { id: 'the-headers', href: '#the-headers', title: 'The headers', level: 2 },
      { id: 'in-use', href: '#in-use', title: 'In use', level: 3 },
    ]);
  });

  it('numbers a repeated anchor from 2, skipping one a heading already took', () => {
    const ids = contentsEntries([
      { title: 'Example' },
      { title: 'Example 2' },
      { title: 'Example' },
      { title: 'Example' },
    ]).map((entry) => entry.id);

    expect(ids).toEqual(['example', 'example-2', 'example-3', 'example-4']);
  });

  it('falls back to a generic anchor for a heading with no letters or digits', () => {
    expect(contentsEntries([{ title: '?' }, { title: '!' }]).map((entry) => entry.id)).toEqual([
      'section',
      'section-2',
    ]);
  });
});

describe('readingLine', () => {
  it('places the line its share of the way down the scrolling area', () => {
    expect(readingLine(100, 800)).toBe(100 + 800 * READING_LINE_SHARE);
  });
});

describe('scrolledToEnd', () => {
  it('reports the end once the area shows its last pixel, within one pixel', () => {
    expect(scrolledToEnd({ scrollTop: 1199.5, clientHeight: 800, scrollHeight: 2000 })).toBe(true);
    expect(scrolledToEnd({ scrollTop: 1190, clientHeight: 800, scrollHeight: 2000 })).toBe(false);
  });

  it('reports no end for an area that cannot scroll', () => {
    expect(scrolledToEnd({ scrollTop: 0, clientHeight: 800, scrollHeight: 800 })).toBe(false);
  });
});

describe('currentHeading', () => {
  const view: ReadingView = { readingLine: 200, areaBottom: 800, scrolledToEnd: false };

  function placed(...tops: readonly number[]): readonly HeadingPlace[] {
    return tops.map((top, index) => ({ id: `h${index + 1}`, top }));
  }

  it('returns the last heading at or above the reading line', () => {
    expect(currentHeading(placed(-900, -40, 200, 600), view)).toBe('h3');
  });

  it('returns the first heading while none has reached the reading line', () => {
    expect(currentHeading(placed(320, 900, 1600), view)).toBe('h1');
  });

  it('returns the last heading the area shows once it is scrolled to the end', () => {
    const atEnd = { ...view, scrolledToEnd: true };

    expect(currentHeading(placed(-900, 100, 500, 700), atEnd)).toBe('h4');
    expect(currentHeading(placed(-900, 100, 500, 1200), atEnd)).toBe('h3');
  });

  it('returns the first heading at the end when every heading lies below the area', () => {
    expect(currentHeading(placed(900, 1200), { ...view, scrolledToEnd: true })).toBe('h1');
  });

  it('returns nothing when no heading is on the page', () => {
    expect(currentHeading([], view)).toBeUndefined();
  });
});
