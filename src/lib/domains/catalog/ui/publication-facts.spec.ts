import { describe, expect, it } from 'vitest';
import { formatFileSize } from '$lib/ui/components/file-selection';
import { publication } from './catalog-ui-fixtures';
import { publicationFacts, summaryLines } from './publication-facts';

const FULL = publication('full', {
  authors: ['Jane Roe', 'John Doe'],
  language: 'ja',
  updated: '2026-08-15T12:30:00+00:00',
  acquisition: {
    href: 'https://home.test/get/full',
    format: 'epub',
    mediaType: 'application/epub+zip',
    length: 1071903,
  },
});

describe('publicationFacts', () => {
  it('lists authors, language, format, size and date in that order', () => {
    expect(publicationFacts(FULL).map((fact) => fact.label)).toEqual([
      'Authors',
      'Language',
      'Format',
      'Size',
      'Updated',
    ]);
  });

  it('joins the authors, names the language and upper-cases the format', () => {
    const facts = publicationFacts(FULL);
    expect(facts[0]?.value).toBe('Jane Roe, John Doe');
    expect(facts[1]?.value).toBe('Japanese');
    expect(facts[2]?.value).toBe('EPUB');
  });

  it('formats the size with the file size helper of the base components', () => {
    const size = publicationFacts(FULL).find((fact) => fact.label === 'Size');
    expect(size?.value).toBe(formatFileSize(1071903));
  });

  it('formats the date as a medium date in the reader locale', () => {
    const updated = publicationFacts(FULL).find((fact) => fact.label === 'Updated');
    const expected = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
      Date.parse('2026-08-15T12:30:00+00:00'),
    );
    expect(updated?.value).toBe(expected);
  });

  it('leaves out every field the publication lacks', () => {
    const bare = publication('bare', { acquisition: null, updated: '' });
    expect(publicationFacts(bare)).toEqual([]);
  });

  it('leaves out the size when the server gave no length', () => {
    const unsized = publication('unsized', {
      acquisition: {
        href: 'https://home.test/get/unsized',
        format: 'cbz',
        mediaType: 'application/x-cbz',
        length: null,
      },
    });
    expect(publicationFacts(unsized).map((fact) => fact.label)).toEqual(['Format', 'Updated']);
  });

  it('leaves out a date that does not parse', () => {
    const odd = publication('odd', { updated: 'yesterday' });
    expect(publicationFacts(odd).map((fact) => fact.label)).toEqual(['Format']);
  });
});

describe('summaryLines', () => {
  it('splits a summary at its line breaks and drops a blank line', () => {
    expect(summaryLines('SERIES: Star [2]\nTale\n\nMore')).toEqual([
      'SERIES: Star [2]',
      'Tale',
      'More',
    ]);
  });

  it('returns no lines for an empty summary', () => {
    expect(summaryLines('')).toEqual([]);
  });
});
