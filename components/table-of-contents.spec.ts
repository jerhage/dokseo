import { describe, expect, it } from 'vitest';
import { anchorSlug, contentsEntries } from './table-of-contents';

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
    expect(contentsEntries([{ title: 'The headers' }, { title: 'In Dokseo', level: 3 }])).toEqual([
      { id: 'the-headers', href: '#the-headers', title: 'The headers', level: 2 },
      { id: 'in-dokseo', href: '#in-dokseo', title: 'In Dokseo', level: 3 },
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
