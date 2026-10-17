import { describe, expect, it } from 'vitest';
import { parseXml } from '$lib/shared/xml-document';
import type { XmlElement } from '$lib/shared/xml-document';
import { CALIBRE_WEB_FEED_ID, feedDialect } from './opds1-dialect';
import { CALIBRE_ROOT, CALIBRE_WEB_BOOKS, CALIBRE_WEB_ROOT } from './opds1-fixtures';

function feedOf(xml: string): XmlElement {
  const root = parseXml(xml, 100_000);
  if (root === null) throw new Error('the fixture does not parse');
  return root;
}

describe('feedDialect', () => {
  it('reads Calibre-Web from the generator its feeds carry', () => {
    expect(feedDialect(feedOf(CALIBRE_WEB_ROOT))).toEqual({
      name: 'calibre-web',
      identifiesEachFeed: false,
    });
    expect(feedDialect(feedOf(CALIBRE_WEB_BOOKS)).name).toBe('calibre-web');
  });

  it('reads Calibre-Web from its one feed id when the generator is missing', () => {
    const feed = `<feed xmlns="http://www.w3.org/2005/Atom"><id>${CALIBRE_WEB_FEED_ID}</id><title>Books</title></feed>`;

    expect(feedDialect(feedOf(feed)).name).toBe('calibre-web');
  });

  it('reads any other server as generic, and trusts the feed id', () => {
    const dialect = feedDialect(feedOf(CALIBRE_ROOT));

    expect(dialect).toEqual({ name: 'generic', identifiesEachFeed: true });
  });
});
