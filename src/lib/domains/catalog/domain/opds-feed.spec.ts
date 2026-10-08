import { describe, expect, it } from 'vitest';
import { catalogId } from '$lib/shared/ids';
import {
  BUY_ONLY,
  CALIBRE_ROOT,
  CALIBRE_SERIES,
  HTML_PAGE,
  NON_FEED_ROOT,
  SPEC_CONFORMING_ACQUISITION,
  SPEC_CONFORMING_NAVIGATION,
  UNKNOWN_MEDIA_TYPE,
} from './opds-fixtures';
import { MAX_FEED_CHARACTERS, readOpdsFeed } from './opds-feed';
import type { AcquisitionFeed, NavigationFeed } from './opds-feed';
import type { FeedPath } from './remote-publication';

const ID = catalogId('c1');
const SERVER = 'http://calibre.local:8080';
const PATH: FeedPath = [{ title: 'By Series', href: `${SERVER}/opds/navcatalog/4e736572696573` }];

function navigation(xml: string, url = `${SERVER}/opds`): NavigationFeed {
  const reading = readOpdsFeed(xml, url, ID, PATH);
  if (reading.kind !== 'navigation') throw new Error(`expected navigation, got ${reading.kind}`);
  return reading.feed;
}

function acquisition(xml: string, url = `${SERVER}/opds/navcatalog/x`): AcquisitionFeed {
  const reading = readOpdsFeed(xml, url, ID, PATH);
  if (reading.kind !== 'acquisition') throw new Error(`expected acquisition, got ${reading.kind}`);
  return reading.feed;
}

describe('readOpdsFeed on a Calibre root', () => {
  it('reads links without a rel, resolving them against the feed url', () => {
    const feed = navigation(CALIBRE_ROOT);

    expect(feed.title).toBe('Sample Library');
    expect(feed.links).toEqual([
      {
        title: 'By Newest',
        href: `${SERVER}/opds/navcatalog/6f6c64657374?library_id=calibre`,
        summary: 'Books sorted by date added',
      },
      {
        title: 'By Series',
        href: `${SERVER}/opds/navcatalog/4e736572696573?library_id=calibre`,
        summary: 'Books by series',
      },
    ]);
  });

  it('keeps the search placeholder literal', () => {
    expect(navigation(CALIBRE_ROOT).searchTemplate).toBe(
      `${SERVER}/opds/search/{searchTerms}?library_id=calibre`,
    );
  });

  it('reports no paging when the feed has none', () => {
    expect(navigation(CALIBRE_ROOT).paging).toEqual({
      next: null,
      previous: null,
      first: null,
      last: null,
    });
  });
});

describe('readOpdsFeed on a Calibre series feed', () => {
  it('reads paging links with their query strings', () => {
    expect(acquisition(CALIBRE_SERIES).paging).toEqual({
      next: `${SERVER}/opds/navcatalog/4e736572696573?library_id=calibre&offset=30`,
      previous: `${SERVER}/opds/navcatalog/4e736572696573?library_id=calibre&offset=0`,
      first: `${SERVER}/opds/navcatalog/4e736572696573?library_id=calibre`,
      last: `${SERVER}/opds/navcatalog/4e736572696573?library_id=calibre&offset=60`,
    });
  });

  it('reads the first publication in full', () => {
    const [first] = acquisition(CALIBRE_SERIES).publications;

    expect(first).toEqual({
      catalogId: ID,
      entryId: 'urn:uuid:11111111-2222-3333-4444-555555555555',
      title: '星の旅 2',
      authors: ['山田 太郎'],
      language: 'ja',
      summary: 'SERIES: 星の旅 [2]The second voyage begins.',
      updated: '2026-08-15T12:30:00+00:00',
      cover: { href: `${SERVER}/get/cover/720/calibre`, mediaType: 'image/jpeg' },
      acquisition: {
        href: `${SERVER}/get/epub/720/calibre`,
        format: 'epub',
        mediaType: 'application/epub+zip',
        length: 1_071_903,
      },
      feedPath: PATH,
    });
  });

  it('maps a declared language and drops a length that is not a whole number', () => {
    const [, second] = acquisition(CALIBRE_SERIES).publications;

    expect(second?.language).toBe('en');
    expect(second?.acquisition).toMatchObject({ format: 'pdf', length: null });
  });

  it('falls back to the cover rel when no image rel is present', () => {
    const [, second] = acquisition(CALIBRE_SERIES).publications;

    expect(second?.cover?.href).toBe(`${SERVER}/get/cover/721/calibre`);
  });

  it('keeps the search template of the feed', () => {
    expect(acquisition(CALIBRE_SERIES).searchTemplate).toBe(
      `${SERVER}/opds/search/{searchTerms}?library_id=calibre`,
    );
  });
});

describe('readOpdsFeed on spec-conforming feeds', () => {
  it('reads a subsection link with an absolute href', () => {
    const feed = navigation(SPEC_CONFORMING_NAVIGATION, 'https://example.org/opds');

    expect(feed.links).toEqual([
      { title: 'Fiction', href: 'https://example.org/opds/fiction', summary: 'Novels and stories' },
    ]);
  });

  it('reads an open-access cbz entry with an image rel', () => {
    const [book] = acquisition(
      SPEC_CONFORMING_ACQUISITION,
      'https://example.org/opds/fiction',
    ).publications;

    expect(book?.cover).toEqual({
      href: 'https://example.org/covers/42.png',
      mediaType: 'image/png',
    });
    expect(book?.acquisition).toEqual({
      href: 'https://example.org/files/42.cbz',
      format: 'cbz',
      mediaType: 'application/vnd.comicbook+zip',
      length: 2048,
    });
    expect(book?.summary).toBe('A short summary.');
  });
});

describe('readOpdsFeed on entries without a usable download', () => {
  it('reports a buy-only entry with no acquisition in an acquisition feed', () => {
    const [book] = acquisition(BUY_ONLY).publications;

    expect(book?.title).toBe('Paid Book');
    expect(book?.acquisition).toBeNull();
  });

  it('reports an unknown media type as no acquisition', () => {
    const [book] = acquisition(UNKNOWN_MEDIA_TYPE).publications;

    expect(book?.acquisition).toBeNull();
  });
});

describe('readOpdsFeed on input that is not a feed', () => {
  it.each([
    ['an HTML page', HTML_PAGE],
    ['a document with another root', NON_FEED_ROOT],
    ['an empty string', ''],
    ['input past the size limit', `<feed>${' '.repeat(MAX_FEED_CHARACTERS)}</feed>`],
  ])('reports %s as not a feed', (_name, xml) => {
    expect(readOpdsFeed(xml, `${SERVER}/opds`, ID, [])).toEqual({ kind: 'not-a-feed' });
  });
});
