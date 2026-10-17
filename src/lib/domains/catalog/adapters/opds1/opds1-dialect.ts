import type { XmlElement } from '$lib/shared/xml-document';
import { childText, childrenNamed } from './opds1-elements';

type DialectName = 'generic' | 'calibre-web';

type FeedDialect = {
  readonly name: DialectName;
  readonly identifiesEachFeed: boolean;
};

const GENERIC_DIALECT: FeedDialect = { name: 'generic', identifiesEachFeed: true };

const CALIBRE_WEB_DIALECT: FeedDialect = { name: 'calibre-web', identifiesEachFeed: false };

const CALIBRE_WEB_URI = 'janeczku/calibre-web';

const CALIBRE_WEB_FEED_ID = 'urn:uuid:2853dacf-ed79-42f5-8e8a-a7bb3d1ae6a2';

function generatorUri(feed: XmlElement): string {
  const author = childrenNamed(feed, 'author')[0];
  return author === undefined ? '' : childText(author, 'uri');
}

function isCalibreWeb(feed: XmlElement): boolean {
  if (generatorUri(feed).includes(CALIBRE_WEB_URI)) return true;
  return childText(feed, 'id') === CALIBRE_WEB_FEED_ID;
}

function feedDialect(feed: XmlElement): FeedDialect {
  return isCalibreWeb(feed) ? CALIBRE_WEB_DIALECT : GENERIC_DIALECT;
}

export { CALIBRE_WEB_DIALECT, CALIBRE_WEB_FEED_ID, CALIBRE_WEB_URI, GENERIC_DIALECT, feedDialect };
export type { DialectName, FeedDialect };
